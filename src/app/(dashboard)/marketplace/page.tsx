"use client"

import { Store } from "lucide-react"
import { useSession } from "next-auth/react"
import { useInvoices } from "@/hooks/useInvoices"
import { InvoiceListing } from "@/components/marketplace/InvoiceListing"
import { InvoiceGridSkeleton } from "@/components/shared/Skeletons"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import { EmptyState } from "@/components/shared/EmptyState"
import { useLanguage } from "@/hooks/useLanguage"

export default function MarketplacePage() {
  const { data: session } = useSession()
  const { invoices, loading, error, refetch } = useInvoices({ scope: "market" })
  const canFund = session?.user?.role === "INVESTOR"
  const { t } = useLanguage()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          {t("nav.marketplace")}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          AI-scored invoices available to fund in USDC.
        </p>
      </div>

      {loading && <InvoiceGridSkeleton />}

      {!loading && error && <ErrorMessage message={error} />}

      {!loading && !error && invoices.length === 0 && (
        <EmptyState
          icon={Store}
          title="No invoices listed yet"
          description="Scored invoices from SMEs will appear here for funding."
        />
      )}

      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {invoices.map((invoice) => (
            <InvoiceListing
              key={invoice.id}
              invoice={invoice}
              canFund={canFund}
              onFunded={refetch}
            />
          ))}
        </div>
      )}
    </div>
  )
}
