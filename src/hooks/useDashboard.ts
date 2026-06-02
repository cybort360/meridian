"use client"

import { useCallback, useEffect, useState } from "react"

export interface DashboardStats {
  totalFinanced: string // base units
  totalFinancedChangePct: number
  capitalDeployed: string // base units
  activeInvoices: number
  avgSettlementDays: number | null
  onTimeRate: number | null
  onTimePointsThisMonth: number
}

export interface PillStat {
  count: number
  amount: string // base units
}

export interface SecondaryStats {
  paid: PillStat & { changePct: number }
  due: PillStat
  overdue: PillStat & { thisWeek: number }
}

export interface MonthlyFlowPoint {
  month: string
  financed: number // USD
  repaid: number // USD
}

export interface PipelineInvoice {
  id: string
  invoiceNumber: string
  buyerName: string
  amountUSDC: string // base units
  status: string
  dueDate: string // ISO
}

export interface PortfolioRisk {
  avgScore: number | null
  low: number
  medium: number
  high: number
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

export interface DashboardData {
  stats: DashboardStats
  secondary: SecondaryStats
  monthlyFlow: MonthlyFlowPoint[]
  pipeline: PipelineInvoice[]
  risk: PortfolioRisk
  recentActivity: ActivityItem[]
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
