"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowLeft, Loader2, Sparkles } from "lucide-react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge"
import { RiskScoreBadge } from "@/components/invoices/RiskScoreBadge"
import { MarkRepaidButton } from "@/components/invoices/MarkRepaidButton"
import type { InvoiceDTO } from "@/types/invoiceDto"

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 py-2 last:border-b-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm text-slate-100">{value}</span>
    </div>
  )
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [invoice, setInvoice] = useState<InvoiceDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rescoring, setRescoring] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/invoices/${params.id}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Could not load the invoice.")
        return
      }
      setInvoice(json.data as InvoiceDTO)
    } catch {
      setError("Could not load the invoice.")
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  async function rescore() {
    if (!invoice) return
    setRescoring(true)
    try {
      const res = await fetch("/api/ai/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      })
      const json = await res.json()
      if (res.ok) setInvoice(json.data as InvoiceDTO)
    } finally {
      setRescoring(false)
    }
  }

  const isOwner = invoice?.sme?.id === session?.user?.id

  const advanceBaseUnits =
    invoice && invoice.advanceRate !== null
      ? (BigInt(invoice.amountUSDC) * BigInt(invoice.advanceRate)) / 100n
      : null

  return (
    <div className="space-y-6">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to invoices
      </Link>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <LoadingSpinner />
          Loading invoice…
        </div>
      )}

      {!loading && error && <ErrorMessage message={error} />}

      {!loading && invoice && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="border-slate-800 bg-slate-900 text-slate-100">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">{invoice.title}</CardTitle>
                    <p className="mt-1 text-sm text-slate-400">
                      #{invoice.invoiceNumber}
                    </p>
                  </div>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <USDCAmount baseUnits={BigInt(invoice.amountUSDC)} size="xl" />
                </div>
                <DetailRow label="Buyer" value={invoice.buyerName} />
                <DetailRow label="Buyer email" value={invoice.buyerEmail} />
                <DetailRow
                  label="Due date"
                  value={format(new Date(invoice.dueDate), "MMM d, yyyy")}
                />
                <DetailRow
                  label="Platform fee"
                  value={`${(invoice.feeRate / 100).toFixed(2)}%`}
                />
                {invoice.description && (
                  <DetailRow label="Description" value={invoice.description} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-800 bg-slate-900 text-slate-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">AI risk assessment</CardTitle>
                <RiskScoreBadge
                  score={invoice.riskScore}
                  label={invoice.riskLabel}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {invoice.riskSummary ? (
                  <p className="text-sm text-slate-300">{invoice.riskSummary}</p>
                ) : (
                  <p className="text-sm text-slate-500">
                    This invoice hasn&apos;t been scored yet.
                  </p>
                )}

                {invoice.advanceRate !== null && advanceBaseUnits !== null && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <p className="text-xs text-slate-500">
                      Recommended advance ({invoice.advanceRate}%)
                    </p>
                    <USDCAmount baseUnits={advanceBaseUnits} size="lg" />
                  </div>
                )}

                {isOwner && (
                  <Button
                    variant="outline"
                    onClick={rescore}
                    disabled={rescoring}
                    className="w-full border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
                  >
                    {rescoring ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Re-score with AI
                  </Button>
                )}
              </CardContent>
            </Card>

            <MarkRepaidButton invoice={invoice} onSettled={setInvoice} />
          </div>
        </div>
      )}
    </div>
  )
}
