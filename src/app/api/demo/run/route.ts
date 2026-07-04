import { NextRequest, NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { runDemo, isDemoMode } from "@/lib/demo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// The orchestrator runs ~5 steps with 2s pauses; keep the function alive for it.
export const maxDuration = 60

// POST /api/demo/run - drives the full Meridian lifecycle and streams a
// demo_step event after each step directly in the response body (SSE framing).
// Streaming from this single invocation (rather than pushing to a separate SSE
// channel) guarantees delivery on serverless, where the producer and a separate
// SSE connection would run in different processes with no shared memory.
export async function POST(_req: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Demo mode is not enabled." }, { status: 404 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      try {
        await runDemo(emit)
      } catch (error) {
        captureError(error, { route: "API /demo/run POST" })
        emit({ type: "demo_error", error: "The demo run could not be completed." })
      } finally {
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
