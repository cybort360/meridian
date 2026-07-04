import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { redeem } from "@/lib/circle/usyc"
import { CircleConfigError } from "@/lib/circle/client"
import { enforceRateLimit, apiLimiter } from "@/lib/rateLimit"
import { captureError } from "@/lib/observability"

const RedeemSchema = z.object({
  positionId: z.string().min(1),
})

// POST /api/yield/redeem - pull a position back from USYC into USDC.
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(req, apiLimiter)
    if (limited) return limited

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = RedeemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await redeem(session.user.id, parsed.data.positionId)
    return NextResponse.json({ data: result })
  } catch (error) {
    if (error instanceof CircleConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    captureError(error, { route: "/api/yield/redeem" })
    return NextResponse.json(
      { error: "Could not redeem from USYC. Please try again." },
      { status: 500 }
    )
  }
}
