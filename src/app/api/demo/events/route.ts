import { NextRequest } from "next/server"
import {
  registerClient,
  unregisterClient,
  encodeSSE,
  SSE_PING,
} from "@/lib/sse"
import { isDemoMode } from "@/lib/demo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const HEARTBEAT_MS = 30_000

// GET /api/demo/events?id=<demoId> — unauthenticated SSE stream for the Demo
// Autopilot. The /demo page opens this, then POSTs /api/demo/run with the same
// id; run() pushes demo_step events to this channel via sendEventToUser.
export async function GET(req: NextRequest) {
  if (!isDemoMode()) {
    return new Response("Not found", { status: 404 })
  }

  const id = new URL(req.url).searchParams.get("id")
  if (!id) {
    return new Response("Missing id", { status: 400 })
  }
  const channel = `demo:${id}`

  let heartbeat: ReturnType<typeof setInterval> | undefined
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | undefined

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller
      registerClient(channel, controller)
      controller.enqueue(encodeSSE({ type: "connected" }))

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(SSE_PING)
        } catch {
          if (heartbeat) clearInterval(heartbeat)
        }
      }, HEARTBEAT_MS)

      const close = () => {
        if (heartbeat) clearInterval(heartbeat)
        unregisterClient(channel, controller)
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
      req.signal.addEventListener("abort", close)
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat)
      if (controllerRef) unregisterClient(channel, controllerRef)
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
