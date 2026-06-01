"use client"

import { cn } from "@/lib/utils"
import { useLanguage } from "@/hooks/useLanguage"
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
  const { t } = useLanguage()
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status]
      )}
    >
      {t(`status.${status.toLowerCase()}`)}
    </span>
  )
}
