import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { transferSchema } from "@/lib/utils/validation"
import { toUSDCBaseUnits } from "@/lib/utils/usdc"
import { transferUSDC, pollTransaction, toPaymentStatus } from "@/lib/circle/payments"
import { CircleConfigError } from "@/lib/circle/client"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = transferSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { toAddress, amount, type } = parsed.data

    const senderWallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
    })
    if (!senderWallet) {
      return NextResponse.json(
        { error: "You don't have a wallet yet." },
        { status: 400 }
      )
    }

    // The Payment record links two known wallets, so the recipient must be a
    // Meridian wallet. (Inbound funding from the faucet shows in history
    // without a Payment row.)
    const receiverWallet = await prisma.wallet.findFirst({
      where: { address: { equals: toAddress, mode: "insensitive" } },
    })
    if (!receiverWallet) {
      return NextResponse.json(
        { error: "Recipient must be a Meridian wallet on Arc." },
        { status: 400 }
      )
    }

    if (receiverWallet.id === senderWallet.id) {
      return NextResponse.json(
        { error: "You can't transfer to your own wallet." },
        { status: 400 }
      )
    }

    const amountBaseUnits = toUSDCBaseUnits(amount)

    // Record the payment up front so we never lose track of an in-flight
    // transfer, then attach the Circle id once initiated.
    const payment = await prisma.payment.create({
      data: {
        senderWalletId: senderWallet.id,
        receiverWalletId: receiverWallet.id,
        amountUSDC: amountBaseUnits,
        type: type ?? "ADVANCE",
        status: "PENDING",
        blockchain: senderWallet.blockchain,
        metadata: type ? undefined : { note: "manual transfer" },
      },
    })

    const result = await transferUSDC({
      fromCircleWalletId: senderWallet.circleWalletId,
      toAddress,
      amountBaseUnits,
    })

    // Bounded poll so the demo gets a final status without a public webhook.
    const status = await pollTransaction(result.circlePaymentId, {
      timeoutMs: 25_000,
    })

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        circlePaymentId: result.circlePaymentId,
        status: toPaymentStatus(status.state),
        txHash: status.txHash,
      },
    })

    return NextResponse.json({
      data: {
        id: updated.id,
        circlePaymentId: updated.circlePaymentId,
        status: updated.status,
        state: status.state,
        txHash: updated.txHash,
        amountUSDC: updated.amountUSDC.toString(),
      },
    })
  } catch (error) {
    if (error instanceof CircleConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    console.error("[API /payments/transfer POST]", error)
    return NextResponse.json(
      { error: "The transfer could not be completed. Please try again." },
      { status: 500 }
    )
  }
}
