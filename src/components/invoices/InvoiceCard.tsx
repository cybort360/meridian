import Link from "next/link"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { InvoiceStatusBadge } from "./InvoiceStatusBadge"
import { RiskScoreBadge } from "./RiskScoreBadge"
import type { InvoiceDTO } from "@/types/invoiceDto"

export function InvoiceCard({ invoice }: { invoice: InvoiceDTO }) {
  return (
    <Link href={`/invoices/${invoice.id}`} className="block">
      <Card className="border-slate-800 bg-slate-900 text-slate-100 transition-colors hover:border-slate-700">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-100">
                {invoice.title}
              </p>
              <p className="truncate text-sm text-slate-400">
                {invoice.buyerName} · #{invoice.invoiceNumber}
              </p>
            </div>
            <InvoiceStatusBadge status={invoice.status} />
          </div>

          <div className="flex items-end justify-between">
            <USDCAmount baseUnits={BigInt(invoice.amountUSDC)} size="lg" />
            <RiskScoreBadge score={invoice.riskScore} label={invoice.riskLabel} />
          </div>

          <p className="text-xs text-slate-500">
            Due {format(new Date(invoice.dueDate), "MMM d, yyyy")}
            {invoice.advanceRate !== null && (
              <> · {invoice.advanceRate}% advance</>
            )}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
