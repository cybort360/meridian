import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getWalletBalance } from "@/lib/circle/wallets"
import { CircleConfigError } from "@/lib/circle/client"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
    })
    if (!wallet) {
      return NextResponse.json(
        { error: "You don't have a wallet yet.", code: "NO_WALLET" },
        { status: 404 }
      )
    }

    const balance = await getWalletBalance(wallet.circleWalletId)

    return NextResponse.json({
      data: {
        circleWalletId: wallet.circleWalletId,
        address: wallet.address,
        blockchain: wallet.blockchain,
        usdcBalance: balance.usdcBalance,
        usdcBalanceRaw: balance.usdcBalanceRaw.toString(),
      },
    })
  } catch (error) {
    if (error instanceof CircleConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    console.error("[API /wallets/balance GET]", error)
    return NextResponse.json(
      { error: "Could not load your balance. Please try again." },
      { status: 500 }
    )
  }
}
