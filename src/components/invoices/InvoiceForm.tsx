"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import { createInvoiceSchema } from "@/lib/utils/invoiceValidation"
import type { InvoiceDTO } from "@/types/invoiceDto"

const inputClass = "border-slate-700 bg-slate-800"

export function InvoiceForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (invoice: InvoiceDTO) => void
  onCancel?: () => void
}) {
  const [title, setTitle] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [buyerName, setBuyerName] = useState("")
  const [buyerEmail, setBuyerEmail] = useState("")
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const parsed = createInvoiceSchema.safeParse({
      title,
      invoiceNumber,
      buyerName,
      buyerEmail,
      amountUSDC: Number(amount),
      dueDate,
      description: description || undefined,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Could not create the invoice.")
        return
      }
      onSuccess(json.data as InvoiceDTO)
    } catch {
      setError("Could not create the invoice.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <ErrorMessage message={error} />}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="Q1 hardware supply"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Invoice number</Label>
          <Input
            id="invoiceNumber"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className={inputClass}
            placeholder="INV-1024"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (USDC)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
            placeholder="10000.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="buyerName">Buyer name</Label>
          <Input
            id="buyerName"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            className={inputClass}
            placeholder="Emirates Retail Group"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="buyerEmail">Buyer email</Label>
          <Input
            id="buyerEmail"
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            className={inputClass}
            placeholder="ap@buyer.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dueDate">Due date</Label>
        <Input
          id="dueDate"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-500"
          placeholder="Goods or services covered by this invoice"
        />
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={loading}
          className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create &amp; score
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
