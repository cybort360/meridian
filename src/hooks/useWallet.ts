"use client"

import { useCallback, useEffect, useState } from "react"
import type { WalletTransaction } from "@/types/circle"

export interface WalletData {
  circleWalletId: string
  address: string
  blockchain: string
  usdcBalance: string
  usdcBalanceRaw: string
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasWallet, setHasWallet] = useState<boolean | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/wallets/balance")

      if (res.status === 404) {
        setHasWallet(false)
        setWallet(null)
        setTransactions([])
        return
      }

      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Could not load your wallet.")
        return
      }

      setHasWallet(true)
      setWallet(json.data)

      const txRes = await fetch("/api/wallets/transactions")
      if (txRes.ok) {
        const txJson = await txRes.json()
        setTransactions(txJson.data ?? [])
      }
    } catch {
      setError("Could not load your wallet.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createWallet = useCallback(async (): Promise<boolean> => {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch("/api/wallets/create", { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Could not create a wallet.")
        return false
      }
      await load()
      return true
    } catch {
      setError("Could not create a wallet.")
      return false
    } finally {
      setCreating(false)
    }
  }, [load])

  return {
    wallet,
    transactions,
    loading,
    error,
    hasWallet,
    creating,
    createWallet,
    refetch: load,
  }
}
