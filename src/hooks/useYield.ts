"use client"

import { useCallback, useEffect, useState } from "react"

export type YieldMode = "SIMULATED" | "REAL"

export interface YieldPositionView {
  id: string
  principalBase: string
  currentValueBase: string
  yieldEarnedBase: string
  apyBps: number
  mode: YieldMode
  chain: string
  shares: string | null
  subscribeTxHash: string | null
  openedAt: string
}

export interface YieldSummary {
  mode: YieldMode
  apyBps: number
  principalBase: string
  currentValueBase: string
  yieldEarnedBase: string
  positions: YieldPositionView[]
}

export function useYield() {
  const [summary, setSummary] = useState<YieldSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/yield")
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Could not load your yield positions.")
        return
      }
      setSummary(json.data as YieldSummary)
    } catch {
      setError("Could not load your yield positions.")
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const subscribe = useCallback(
    async (amount: number): Promise<string | null> => {
      setPending(true)
      setError(null)
      try {
        const res = await fetch("/api/yield/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        })
        const json = await res.json()
        if (!res.ok) return json.error ?? "Could not allocate to USYC."
        await load({ silent: true })
        return null
      } catch {
        return "Could not allocate to USYC."
      } finally {
        setPending(false)
      }
    },
    [load]
  )

  const redeem = useCallback(
    async (positionId: string): Promise<string | null> => {
      setPending(true)
      setError(null)
      try {
        const res = await fetch("/api/yield/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positionId }),
        })
        const json = await res.json()
        if (!res.ok) return json.error ?? "Could not redeem from USYC."
        await load({ silent: true })
        return null
      } catch {
        return "Could not redeem from USYC."
      } finally {
        setPending(false)
      }
    },
    [load]
  )

  return { summary, loading, error, pending, subscribe, redeem, refetch: load }
}
