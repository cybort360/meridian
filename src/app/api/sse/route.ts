import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  registerClient,
  unregisterClient,
  encodeSSE,
  SSE_PING,
} from "@/lib/sse"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const HEARTBEAT_MS = 30_000

// GET /api/sse - opens a Server-Sent Events stream for the authenticated user.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }
  const userId = session.user.id

  let heartbeat: ReturnType<typeof setInterval> | undefined
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | undefined

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller
      registerClient(userId, controller)
      // Greet the client so it can flip to a "connected" state immediately.
      controller.enqueue(encodeSSE({ type: "connected" }))

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(SSE_PING)
        } catch {
          if (heartbeat) clearInterval(heartbeat)
        }
      }, HEARTBEAT_MS)

      // Clean up when the client disconnects (request aborted).
      const close = () => {
        if (heartbeat) clearInterval(heartbeat)
        unregisterClient(userId, controller)
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
      if (controllerRef) unregisterClient(userId, controllerRef)
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
