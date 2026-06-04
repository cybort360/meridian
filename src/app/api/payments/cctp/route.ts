import { NextRequest, NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { bridgeUSDCFromArc, CCTP_DESTINATIONS } from "@/lib/circle/cctp"

const cctpSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  destinationChain: z.enum(CCTP_DESTINATIONS).optional(),
})

// POST /api/payments/cctp — bridge USDC from Arc to another testnet chain.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = cctpSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
    })
    if (!wallet) {
      return NextResponse.json(
        { error: "You need a wallet before bridging." },
        { status: 400 }
      )
    }

    const result = await bridgeUSDCFromArc({
      fromAddress: wallet.address,
      amount: String(parsed.data.amount),
      destinationChain: parsed.data.destinationChain,
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    captureError(error, { route: "API /payments/cctp POST" })
    return NextResponse.json(
      { error: "The cross-chain transfer could not be completed." },
      { status: 500 }
    )
  }
}
