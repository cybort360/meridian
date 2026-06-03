"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
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
import { RiskScoreBadge } from "@/components/invoices/RiskScoreBadge"
import type { InvoiceDTO } from "@/types/invoiceDto"

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm text-slate-100">{value}</span>
    </div>
  )
}

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

  const amount = BigInt(invoice.amountUSDC)
  const advanceBaseUnits =
    invoice.advanceRate !== null
      ? (amount * BigInt(invoice.advanceRate)) / 100n
      : 0n
  // Investor is repaid their principal at settlement; the fee goes to the protocol.
  const principalReturned = advanceBaseUnits

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
      toast.success("Funded!", {
        description: `${invoice.title} is now active.`,
      })
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
          className="bg-gold text-[#0C0D13] hover:bg-gold-bright"
        >
          Fund
        </Button>
      </DialogTrigger>
      <DialogContent className="dark border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle>{invoice.title}</DialogTitle>
          <DialogDescription className="text-slate-400">
            You&apos;ll advance USDC now and be repaid your principal when the
            buyer repays.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && <ErrorMessage message={error} />}

          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-3">
            <Row label="Buyer" value={invoice.buyerName} />
            <Row
              label="Invoice value"
              value={<USDCAmount baseUnits={amount} size="sm" />}
            />
            <Row
              label="Risk"
              value={
                <RiskScoreBadge
                  score={invoice.riskScore}
                  label={invoice.riskLabel}
                />
              }
            />
            <Row
              label="Advance rate"
              value={`${invoice.advanceRate ?? 0}%`}
            />
          </div>

          <div className="space-y-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-3">
            <Row
              label="Your cost (advance)"
              value={<USDCAmount baseUnits={advanceBaseUnits} size="sm" />}
            />
            <Row
              label="Principal returned"
              value={<USDCAmount baseUnits={principalReturned} size="sm" />}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={confirm}
            disabled={loading}
            className="bg-gold text-[#0C0D13] hover:bg-gold-bright"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Fund this invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
