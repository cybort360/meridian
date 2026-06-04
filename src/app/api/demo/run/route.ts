import { NextRequest, NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { z } from "zod"
import { sendEventToUser } from "@/lib/sse"
import { runDemo, isDemoMode } from "@/lib/demo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// The orchestrator runs ~5 steps with 2s pauses; keep the function alive for it.
export const maxDuration = 60

const RunSchema = z.object({ demoId: z.string().min(1) })

// POST /api/demo/run — drives the full Meridian lifecycle, emitting a demo_step
// event after each step to the SSE channel keyed by demoId.
export async function POST(req: NextRequest) {
  try {
    if (!isDemoMode()) {
      return NextResponse.json({ error: "Demo mode is not enabled." }, { status: 404 })
    }

    const body = await req.json().catch(() => null)
    const parsed = RunSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "A demoId is required." }, { status: 400 })
    }

    const channel = `demo:${parsed.data.demoId}`
    const result = await runDemo((event) => sendEventToUser(channel, event))

    return NextResponse.json({ data: result }, { status: 200 })
  } catch (error) {
    captureError(error, { route: "API /demo/run POST" })
    return NextResponse.json(
      { error: "The demo run could not be completed." },
      { status: 500 }
    )
  }
}
