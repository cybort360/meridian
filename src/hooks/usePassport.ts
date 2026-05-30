"use client"

import { useCallback, useEffect, useState } from "react"
import type { InvoiceStatus } from "@/types"

export interface CreditEventDTO {
  id: string
  type: string
  scoreChange: number
  newScore: number
  invoiceId: string | null
  createdAt: string
}

export interface PassportInvoice {
  id: string
  title: string
  status: InvoiceStatus
  amountUSDC: string
  createdAt: string
  settledAt: string | null
}

export interface PassportData {
  creditScore: number
  totalVolumeFinanced: string
  onTimeRate: number | null
  invoicesFinanced: number
  totalInvoices: number
  events: CreditEventDTO[]
  invoices: PassportInvoice[]
}

export function usePassport() {
  const [passport, setPassport] = useState<PassportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/passport")
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Could not load your passport.")
        return
      }
      setPassport(json.data as PassportData)
    } catch {
      setError("Could not load your passport.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { passport, loading, error, refetch: load }
}
