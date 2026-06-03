"use client"

import { useState } from "react"
import { Loader2, CheckCircle2 } from "lucide-react"
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
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import type { InvoiceDTO } from "@/types/invoiceDto"

// Demo control: triggers the settlement waterfall (buyer repayment → investor
// payout + protocol fee). Renders only for ACTIVE invoices.
export function MarkRepaidButton({
  invoice,
  onSettled,
}: {
  invoice: InvoiceDTO
  onSettled?: (invoice: InvoiceDTO) => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (invoice.status !== "ACTIVE") return null

  async function confirmSettle() {
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
      setOpen(false)
      toast.success("Invoice settled!", {
        description: `${invoice.title} has been repaid and settled.`,
      })
      onSettled?.(json.data as InvoiceDTO)
    } catch {
      setError("Could not settle the invoice.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gold text-[#0C0D13] hover:bg-gold-bright">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Mark as repaid by buyer
        </Button>
      </DialogTrigger>
      <DialogContent className="dark border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle>Mark as repaid by buyer</DialogTitle>
          <DialogDescription className="text-slate-400">
            This simulates the buyer paying back. Proceed?
          </DialogDescription>
        </DialogHeader>

        {error && <ErrorMessage message={error} />}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={confirmSettle}
            disabled={loading}
            className="bg-gold text-[#0C0D13] hover:bg-gold-bright"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Proceed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
