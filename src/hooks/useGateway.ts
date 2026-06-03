"use client"

import { useCallback, useEffect, useState } from "react"

export interface UnifiedBalance {
  totalUSDC: string
  totalUSDCRaw: string
  perDomain: Array<{ domain: number; balance: string }>
}

export function useGateway() {
  const [balance, setBalance] = useState<UnifiedBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/gateway/balance")
      if (res.status === 404) {
        setBalance(null)
        return
      }
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Could not load your unified balance.")
        return
      }
      setBalance(json.data as UnifiedBalance)
    } catch {
      setError("Could not load your unified balance.")
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const deposit = useCallback(
    async (amount: number): Promise<string | null> => {
      setPending(true)
      setError(null)
      try {
        const res = await fetch("/api/gateway/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        })
        const json = await res.json()
        if (!res.ok) return json.error ?? "Could not deposit into Gateway."
        await load({ silent: true })
        return null
      } catch {
        return "Could not deposit into Gateway."
      } finally {
        setPending(false)
      }
    },
    [load]
  )

  const withdraw = useCallback(
    async (amount: number): Promise<string | null> => {
      setPending(true)
      setError(null)
      try {
        const res = await fetch("/api/gateway/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        })
        const json = await res.json()
        if (!res.ok) return json.error ?? "Could not bring USDC back to Arc."
        await load({ silent: true })
        return null
      } catch {
        return "Could not bring USDC back to Arc."
      } finally {
        setPending(false)
      }
    },
    [load]
  )

  return { balance, loading, error, pending, deposit, withdraw, refetch: load }
}
