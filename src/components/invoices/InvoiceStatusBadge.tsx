"use client"

import { cn } from "@/lib/utils"
import { useLanguage } from "@/hooks/useLanguage"
import type { InvoiceStatus } from "@/types"

// Pill badges in the new system: rgba-tinted background + matching border.
const EMERALD = "bg-[rgba(16,185,129,0.1)] text-[#10B981] border-[rgba(16,185,129,0.2)]"
const AMBER = "bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border-[rgba(245,158,11,0.2)]"
const RED = "bg-[rgba(239,68,68,0.1)] text-[#EF4444] border-[rgba(239,68,68,0.2)]"
const INDIGO = "bg-[rgba(129,140,248,0.1)] text-[#818CF8] border-[rgba(129,140,248,0.2)]"
const GRAY = "bg-[rgba(75,85,99,0.1)] text-[#6B7280] border-[rgba(75,85,99,0.2)]"

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  PENDING: INDIGO,
  SCORED: INDIGO,
  FUNDED: AMBER,
  ACTIVE: EMERALD,
  REPAID: EMERALD,
  SETTLED: EMERALD,
  DEFAULTED: RED,
  CANCELLED: GRAY,
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { t } = useLanguage()
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-[3px] text-[10px] font-semibold uppercase tracking-[0.08em]",
        STATUS_STYLES[status]
      )}
    >
      {t(`status.${status.toLowerCase()}`)}
    </span>
  )
}
