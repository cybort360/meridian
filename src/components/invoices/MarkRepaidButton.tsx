"use client"

import { useState } from "react"
import { Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import type { InvoiceDTO } from "@/types/invoiceDto"

// Demo control: triggers the settlement waterfall (buyer repayment → investor
// payout). Renders only meaningfully for ACTIVE invoices.
export function MarkRepaidButton({
  invoice,
  onSettled,
}: {
  invoice: InvoiceDTO
  onSettled?: (invoice: InvoiceDTO) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (invoice.status !== "ACTIVE") return null

  async function markRepaid() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/settle`, {
        method: "POST",
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Could not settle the invoice.")
        return
      }
      onSettled?.(json.data as InvoiceDTO)
    } catch {
      setError("Could not settle the invoice.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && <ErrorMessage message={error} />}
      <Button
        onClick={markRepaid}
        disabled={loading}
        className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        )}
        Mark as repaid &amp; settle
      </Button>
    </div>
  )
}
