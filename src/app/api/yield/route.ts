import { NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getYieldSummary } from "@/lib/circle/usyc"
import { CircleConfigError } from "@/lib/circle/client"

// GET /api/yield — the investor's active USYC yield positions + totals.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const summary = await getYieldSummary(session.user.id)
    return NextResponse.json({ data: summary })
  } catch (error) {
    if (error instanceof CircleConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    captureError(error, { route: "API /yield GET" })
    return NextResponse.json(
      { error: "Could not load your yield positions. Please try again." },
      { status: 500 }
    )
  }
}
