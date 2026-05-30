"use client"

import { useCallback, useEffect, useState } from "react"
import type { InvoiceDTO } from "@/types/invoiceDto"

interface UseInvoicesOptions {
  scope?: "market"
  status?: string
}

export function useInvoices(opts: UseInvoicesOptions = {}) {
  const { scope, status } = opts
  const [invoices, setInvoices] = useState<InvoiceDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (scope) params.set("scope", scope)
      if (status) params.set("status", status)
      const qs = params.toString()

      const res = await fetch(`/api/invoices${qs ? `?${qs}` : ""}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Could not load invoices.")
        return
      }
      setInvoices((json.data ?? []) as InvoiceDTO[])
    } catch {
      setError("Could not load invoices.")
    } finally {
      setLoading(false)
    }
  }, [scope, status])

  useEffect(() => {
    load()
  }, [load])

  return { invoices, loading, error, refetch: load }
}
