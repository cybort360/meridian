"use client"

import { useEffect, useState } from "react"

export interface RealtimeEvent {
  type: string
  [key: string]: unknown
}

// Opens an EventSource to /api/sse for the lifetime of the component and
// surfaces the most recent event plus the connection status. Each consumer
// holds its own connection (the server fans events out to all of a user's
// connections), and it's closed on unmount.
export function useRealtimeUpdates() {
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const source = new EventSource("/api/sse")

    source.onopen = () => setConnected(true)
    source.onerror = () => setConnected(false) // EventSource auto-reconnects
    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as RealtimeEvent
        if (data.type === "ping") return
        if (data.type === "connected") {
          setConnected(true)
          return
        }
        setLastEvent(data)
      } catch {
        // ignore malformed frames
      }
    }

    return () => source.close()
  }, [])

  return { lastEvent, connected }
}
