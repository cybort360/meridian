import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { subscribe } from "@/lib/circle/usyc"
import { toUSDCBaseUnits } from "@/lib/utils/usdc"
import { CircleConfigError } from "@/lib/circle/client"
import { enforceRateLimit, apiLimiter } from "@/lib/rateLimit"
import { captureError } from "@/lib/observability"

const SubscribeSchema = z.object({
  amount: z.number().positive().max(10_000_000),
})

// POST /api/yield/subscribe - move idle USDC into USYC (earn T-bill yield).
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(req, apiLimiter)
    if (limited) return limited

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = SubscribeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter a valid amount to allocate.", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const position = await subscribe(
      session.user.id,
      toUSDCBaseUnits(parsed.data.amount)
    )
    return NextResponse.json({ data: position })
  } catch (error) {
    if (error instanceof CircleConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    captureError(error, { route: "/api/yield/subscribe" })
    return NextResponse.json(
      { error: "Could not allocate to USYC. Please try again." },
      { status: 500 }
    )
  }
}
