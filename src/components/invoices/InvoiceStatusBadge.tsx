import { cn } from "@/lib/utils"
import type { InvoiceStatus } from "@/types"

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  PENDING: "bg-slate-700 text-slate-300",
  SCORED: "bg-blue-900/50 text-blue-300",
  FUNDED: "bg-purple-900/50 text-purple-300",
  ACTIVE: "bg-emerald-900/50 text-emerald-300",
  REPAID: "bg-cyan-900/50 text-cyan-300",
  SETTLED: "bg-emerald-900/50 text-emerald-400",
  DEFAULTED: "bg-red-900/50 text-red-400",
  CANCELLED: "bg-slate-800 text-slate-500",
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status]
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}
