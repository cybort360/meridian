"use client"

import { useCallback, useEffect, useState } from "react"

export interface DashboardStats {
  totalVolumeFinanced: string
  activeInvoices: number
  creditScore: number
  onTimeRate: number | null
}

export interface ActivityItem {
  id: string
  type: string
  status: string
  amountUSDC: string
  direction: "IN" | "OUT"
  counterparty: string
  createdAt: string
}

export interface FlowPoint {
  date: string
  amount: string
}

export interface DashboardData {
  stats: DashboardStats
  recentActivity: ActivityItem[]
  flow: FlowPoint[]
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/dashboard")
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Could not load the dashboard.")
        return
      }
      setData(json.data as DashboardData)
    } catch {
      setError("Could not load the dashboard.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refetch: load }
}
