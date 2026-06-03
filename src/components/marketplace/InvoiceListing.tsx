import Link from "next/link"
import { format } from "date-fns"
import { ShieldCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { RiskScoreBadge } from "@/components/invoices/RiskScoreBadge"
import { FundModal } from "@/components/marketplace/FundModal"
import type { InvoiceDTO } from "@/types/invoiceDto"

export function InvoiceListing({
  invoice,
  canFund = false,
  onFunded,
}: {
  invoice: InvoiceDTO
  canFund?: boolean
  onFunded?: () => void
}) {
  const advanceBaseUnits =
    invoice.advanceRate !== null
      ? (BigInt(invoice.amountUSDC) * BigInt(invoice.advanceRate)) / 100n
      : null

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-100">
              {invoice.title}
            </p>
            <div className="flex items-center gap-2">
              <p className="truncate text-sm text-slate-400">
                {invoice.sme?.companyName ?? invoice.sme?.name ?? "SME"}
              </p>
              {invoice.sme?.kycStatus === "APPROVED" && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[rgba(200,169,110,0.25)] bg-[rgba(200,169,110,0.12)] px-2.5 py-[3px] text-[10px] font-semibold uppercase tracking-[0.08em] text-gold">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </span>
              )}
            </div>
          </div>
          <RiskScoreBadge score={invoice.riskScore} label={invoice.riskLabel} />
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
          <div>
            <p className="text-xs text-slate-500">Invoice value</p>
            <USDCAmount baseUnits={BigInt(invoice.amountUSDC)} size="md" />
          </div>
          {advanceBaseUnits !== null && (
            <div>
              <p className="text-xs text-slate-500">
                Advance ({invoice.advanceRate}%)
              </p>
              <USDCAmount baseUnits={advanceBaseUnits} size="md" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Due {format(new Date(invoice.dueDate), "MMM d, yyyy")}
          </p>
          <div className="flex items-center gap-2">
            <Link href={`/invoices/${invoice.id}`}>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
              >
                View
              </Button>
            </Link>
            {canFund && <FundModal invoice={invoice} onFunded={onFunded} />}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
