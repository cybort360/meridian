"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, UploadCloud, FileText, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import { createInvoiceSchema } from "@/lib/utils/invoiceValidation"
import { useLanguage } from "@/hooks/useLanguage"
import { cn } from "@/lib/utils"
import type { InvoiceDTO } from "@/types/invoiceDto"
import type { ParsedInvoice } from "@/lib/ai/invoiceParsing"

const inputClass = "border-slate-700 bg-slate-800"
const MAX_BYTES = 10 * 1024 * 1024 // 10MB

export function InvoiceForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (invoice: InvoiceDTO) => void
  onCancel?: () => void
}) {
  const { t } = useLanguage()
  const [title, setTitle] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [buyerName, setBuyerName] = useState("")
  const [buyerEmail, setBuyerEmail] = useState("")
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // PDF parsing (optional — the form works fully without it).
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsed, setParsed] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Auto-dismiss the parse error after 4 seconds.
  useEffect(() => {
    if (!parseError) return
    const id = setTimeout(() => setParseError(null), 4000)
    return () => clearTimeout(id)
  }, [parseError])

  function applyParsed(data: ParsedInvoice) {
    if (data.invoiceNumber) setInvoiceNumber(data.invoiceNumber)
    if (data.buyerName) setBuyerName(data.buyerName)
    if (data.buyerEmail) setBuyerEmail(data.buyerEmail)
    if (data.amountUSD !== null && data.amountUSD !== undefined) {
      setAmount(String(data.amountUSD))
    }
    if (data.dueDate) setDueDate(data.dueDate)
    if (data.description) setDescription(data.description)
  }

  async function handleFile(file: File) {
    setParseError(null)
    setParsed(false)

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      setParseError("Could not read PDF — please fill in manually")
      return
    }
    if (file.size > MAX_BYTES) {
      setParseError("PDF is too large. Maximum size is 10MB.")
      return
    }

    setParsing(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/invoices/parse-pdf", {
        method: "POST",
        body,
      })
      const json = await res.json()
      if (!res.ok) {
        // Surface the size message; everything else gets the manual hint.
        setParseError(
          res.status === 413
            ? (json.error ?? "PDF is too large. Maximum size is 10MB.")
            : "Could not read PDF — please fill in manually"
        )
        return
      }
      applyParsed(json.data as ParsedInvoice)
      setParsed(true)
    } catch {
      setParseError("Could not read PDF — please fill in manually")
    } finally {
      setParsing(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const result = createInvoiceSchema.safeParse({
      title,
      invoiceNumber,
      buyerName,
      buyerEmail,
      amountUSDC: Number(amount),
      dueDate,
      description: description || undefined,
    })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Please check your details.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
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

      {/* AI PDF upload (optional) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !parsing && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !parsing) {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
          dragActive
            ? "border-emerald-400 bg-emerald-400/5"
            : "border-slate-700 hover:border-slate-600",
          parsing && "pointer-events-none opacity-80"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          // The input is a child of the clickable dropzone. Calling .click()
          // dispatches a synthetic click that bubbles back to the div's
          // onClick, which calls .click() again — a re-entrant loop Chrome
          // blocks (the file picker silently never opens). Stop the bubble.
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = "" // allow re-selecting the same file
          }}
        />
        {parsing ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            <p className="text-sm text-slate-300">AI is reading your invoice...</p>
          </>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-slate-400" />
            <p className="text-sm font-medium text-slate-200">
              Drop your invoice PDF here or click to upload
            </p>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <FileText className="h-3 w-3" />
              PDF up to 10MB — fields auto-fill for you to review
            </p>
          </>
        )}
      </div>

      {parseError && <ErrorMessage message={parseError} />}

      {parsed && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Invoice parsed — please review and confirm the details
        </div>
      )}

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
          <Label htmlFor="amount">{t("invoices.amount")}</Label>
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
          <Label htmlFor="buyerName">{t("invoices.buyer")}</Label>
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
        <Label htmlFor="dueDate">{t("invoices.dueDate")}</Label>
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
          className="bg-gold text-[#0C0D13] hover:bg-gold-bright"
        >
          {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t("invoices.submit")}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
          >
            {t("common.cancel")}
          </Button>
        )}
      </div>
    </form>
  )
}
