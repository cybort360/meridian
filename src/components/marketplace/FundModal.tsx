"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import type { InvoiceDTO } from "@/types/invoiceDto"

export function FundModal({
  invoice,
  onFunded,
}: {
  invoice: InvoiceDTO
  onFunded?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const advanceBaseUnits =
    invoice.advanceRate !== null
      ? (BigInt(invoice.amountUSDC) * BigInt(invoice.advanceRate)) / 100n
      : 0n

  async function confirm() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/fund`, {
        method: "POST",
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Could not fund the invoice.")
        return
      }
      setOpen(false)
      onFunded?.()
    } catch {
      setError("Could not fund the invoice.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
        >
          Fund
        </Button>
      </DialogTrigger>
      <DialogContent className="dark border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle>Fund invoice</DialogTitle>
          <DialogDescription className="text-slate-400">
            You&apos;ll advance USDC now and receive principal plus yield when the
            buyer repays.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {error && <ErrorMessage message={error} />}
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
            <span className="text-sm text-slate-400">Invoice value</span>
            <USDCAmount baseUnits={BigInt(invoice.amountUSDC)} size="md" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
            <span className="text-sm text-slate-400">
              You advance ({invoice.advanceRate ?? 0}%)
            </span>
            <USDCAmount baseUnits={advanceBaseUnits} size="md" />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={confirm}
            disabled={loading}
            className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm funding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
