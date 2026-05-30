import { cn } from "@/lib/utils"
import type { RiskLabel } from "@/types"

const RISK_STYLES: Record<RiskLabel, string> = {
  LOW: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  MEDIUM: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  HIGH: "bg-red-400/10 text-red-400 border-red-400/20",
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
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        RISK_STYLES[label]
      )}
    >
      <span className="font-mono font-semibold">{score}</span>
      <span className="uppercase tracking-wide">{label}</span>
    </span>
  )
}
