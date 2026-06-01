// In-process Server-Sent Events registry. The SSE route registers a stream
// controller per open connection (keyed by userId) and the webhook handler
// pushes events to them via sendEventToUser.
//
// Next.js can instantiate this module more than once (a separate copy is
// bundled into each route that imports it), which would give the SSE route and
// the webhook *different* Maps. To guarantee they share one registry, the Map
// is pinned to globalThis — the same singleton trick used for the Prisma client.
//
// Delivery only works when the SSE connection and the event producer run in the
// same Node process (true for a long-running server / local dev; not across
// isolated serverless invocations).

type SSEController = ReadableStreamDefaultController<Uint8Array>

const encoder = new TextEncoder()

const globalForSSE = globalThis as unknown as {
  __meridianSSEClients?: Map<string, Set<SSEController>>
}
const clients =
  globalForSSE.__meridianSSEClients ??
  (globalForSSE.__meridianSSEClients = new Map<string, Set<SSEController>>())

// Encode an arbitrary event object as an SSE `data:` frame.
export function encodeSSE(event: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
}

// Pre-encoded heartbeat frame.
export const SSE_PING = encoder.encode('data: {"type":"ping"}\n\n')

export function registerClient(userId: string, controller: SSEController): void {
  let set = clients.get(userId)
  if (!set) {
    set = new Set()
    clients.set(userId, set)
  }
  set.add(controller)
}

export function unregisterClient(
  userId: string,
  controller: SSEController
): void {
  const set = clients.get(userId)
  if (!set) return
  set.delete(controller)
  if (set.size === 0) clients.delete(userId)
}

// Push an event to every open connection for a user. Best-effort: enqueueing to
// a closed controller throws, so that connection is dropped.
export async function sendEventToUser(
  userId: string,
  event: object
): Promise<void> {
  const set = clients.get(userId)
  if (!set || set.size === 0) return

  const frame = encodeSSE(event)
  for (const controller of [...set]) {
    try {
      controller.enqueue(frame)
    } catch {
      unregisterClient(userId, controller)
    }
  }
}
