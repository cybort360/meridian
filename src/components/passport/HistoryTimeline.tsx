import { format } from "date-fns"
import { FileText } from "lucide-react"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge"
import type { PassportInvoice } from "@/hooks/usePassport"

export function HistoryTimeline({
  invoices,
}: {
  invoices: PassportInvoice[]
}) {
  return (
    <ol className="relative space-y-5 border-l border-slate-800 pl-6">
      {invoices.map((invoice) => (
        <li key={invoice.id} className="relative">
          <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-slate-400 ring-4 ring-slate-950">
            <FileText className="h-3 w-3" />
          </span>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-200">
                {invoice.title}
              </p>
              <p className="text-xs text-slate-500">
                {format(new Date(invoice.createdAt), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <USDCAmount baseUnits={BigInt(invoice.amountUSDC)} size="sm" />
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
