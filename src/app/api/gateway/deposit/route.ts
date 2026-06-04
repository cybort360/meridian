import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { depositToGateway } from "@/lib/circle/gateway"
import { toUSDCBaseUnits } from "@/lib/utils/usdc"
import { CircleConfigError } from "@/lib/circle/client"
import { enforceRateLimit, apiLimiter } from "@/lib/rateLimit"
import { captureError } from "@/lib/observability"

const DepositSchema = z.object({
  amount: z.number().positive().max(10_000_000),
})

// POST /api/gateway/deposit — deposit USDC from the Arc wallet into the Gateway
// Wallet contract, funding the unified balance.
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(req, apiLimiter)
    if (limited) return limited

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = DepositSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter a valid amount to deposit.", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
    })
    if (!wallet) {
      return NextResponse.json(
        { error: "You don't have a wallet yet." },
        { status: 400 }
      )
    }

    const result = await depositToGateway(
      wallet.circleWalletId,
      toUSDCBaseUnits(parsed.data.amount)
    )
    return NextResponse.json({ data: result })
  } catch (error) {
    if (error instanceof CircleConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    captureError(error, { route: "/api/gateway/deposit" })
    return NextResponse.json(
      { error: "Could not deposit into Gateway. Please try again." },
      { status: 500 }
    )
  }
}
