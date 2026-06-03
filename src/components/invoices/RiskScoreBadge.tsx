import { cn } from "@/lib/utils"
import type { RiskLabel } from "@/types"

const RISK_STYLES: Record<RiskLabel, string> = {
  LOW: "bg-[rgba(16,185,129,0.1)] text-[#10B981] border-[rgba(16,185,129,0.2)]",
  MEDIUM: "bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border-[rgba(245,158,11,0.2)]",
  HIGH: "bg-[rgba(239,68,68,0.1)] text-[#EF4444] border-[rgba(239,68,68,0.2)]",
}

interface Props {
  score: number | null
  label: RiskLabel | null
}

export function RiskScoreBadge({ score, label }: Props) {
  if (score === null || label === null) {
    return (
      <span className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400">
        Scoring…
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[10px] font-semibold uppercase tracking-[0.08em]",
        RISK_STYLES[label]
      )}
    >
      <span className="font-mono">{score}</span>
      <span>{label}</span>
    </span>
  )
}
