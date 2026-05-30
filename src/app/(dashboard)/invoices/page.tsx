"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { FileText, Plus } from "lucide-react"
import { useInvoices } from "@/hooks/useInvoices"
import { InvoiceCard } from "@/components/invoices/InvoiceCard"
import { InvoiceForm } from "@/components/invoices/InvoiceForm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import { EmptyState } from "@/components/shared/EmptyState"

export default function InvoicesPage() {
  const { data: session } = useSession()
  const { invoices, loading, error, refetch } = useInvoices()
  const [showForm, setShowForm] = useState(false)

  const isSme = session?.user?.role === "SME"

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Invoices
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {isSme
              ? "Upload invoices and let the AI engine score them for financing."
              : "Invoices you have funded."}
          </p>
        </div>
        {isSme && !showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          >
            <Plus className="mr-2 h-4 w-4" />
            New invoice
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle className="text-base">Create invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceForm
              onCancel={() => setShowForm(false)}
              onSuccess={() => {
                setShowForm(false)
                refetch()
              }}
            />
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <LoadingSpinner />
          Loading invoices…
        </div>
      )}

      {!loading && error && <ErrorMessage message={error} />}

      {!loading && !error && invoices.length === 0 && !showForm && (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description={
            isSme
              ? "Create your first invoice to get an instant AI risk score."
              : "Funded invoices will appear here."
          }
        >
          {isSme && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            >
              <Plus className="mr-2 h-4 w-4" />
              New invoice
            </Button>
          )}
        </EmptyState>
      )}

      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {invoices.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      )}
    </div>
  )
}
