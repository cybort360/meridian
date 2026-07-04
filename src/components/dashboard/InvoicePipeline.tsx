"use client"

import Link from "next/link"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/EmptyState"
import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { InvoiceStatus } from "@/types"
import type { PipelineInvoice } from "@/hooks/useDashboard"

const DAY_MS = 86_400_000
const CLOSED = ["SETTLED", "CANCELLED", "DEFAULTED"]

function daysRemaining(dueDate: string, status: string): React.ReactNode {
  if (CLOSED.includes(status)) return <span className="text-slate-600">-</span>
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / DAY_MS)
  if (days < 0) return <span className="text-red-400">Overdue</span>
  if (days === 0) return <span className="text-amber-400">Today</span>
  return (
    <span className={cn(days <= 7 ? "text-amber-400" : "text-slate-300")}>
      {days}d
    </span>
  )
}

export function InvoicePipeline({ invoices }: { invoices: PipelineInvoice[] }) {
  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Invoice Pipeline</CardTitle>
        <Link
          href="/invoices"
          className="text-xs text-emerald-400 hover:underline"
        >
          View all →
        </Link>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="New invoices will appear here as they're created."
          />
        ) : (
          <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 font-medium">Invoice</th>
                <th className="pb-2 font-medium">Buyer</th>
                <th className="pb-2 text-right font-medium">Amount</th>
                <th className="pb-2 text-center font-medium">Status</th>
                <th className="pb-2 text-right font-medium">Days left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {invoices.map((inv) => (
                <tr key={inv.id} className="group">
                  <td className="py-3 font-mono text-slate-300">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="hover:text-emerald-400"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="max-w-[10rem] truncate py-3 text-slate-300">
                    {inv.buyerName}
                  </td>
                  <td className="py-3 text-right">
                    <USDCAmount
                      baseUnits={BigInt(inv.amountUSDC)}
                      size="sm"
                      showSymbol={false}
                    />
                  </td>
                  <td className="py-3 text-center">
                    <InvoiceStatusBadge status={inv.status as InvoiceStatus} />
                  </td>
                  <td className="py-3 text-right font-mono">
                    {daysRemaining(inv.dueDate, inv.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
