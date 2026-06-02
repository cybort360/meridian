"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PortfolioRisk } from "@/hooks/useDashboard"

// Risk score is 0–100, higher = riskier.
function barColor(score: number): string {
  if (score < 34) return "bg-emerald-400"
  if (score < 67) return "bg-amber-400"
  return "bg-red-400"
}

function Legend({
  label,
  count,
  dot,
}: {
  label: string
  count: number
  dot: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-indigo-200/80">
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        {label}
      </span>
      <span className="font-medium text-indigo-50">
        {count} {count === 1 ? "invoice" : "invoices"}
      </span>
    </div>
  )
}

export function RiskIntelligence({ risk }: { risk: PortfolioRisk }) {
  const router = useRouter()
  const total = risk.low + risk.medium + risk.high
  const score = risk.avgScore ?? 0

  function runAnalysis() {
    if (total === 0) {
      toast("Analyzing portfolio...", {
        description: "No active invoices to assess yet.",
      })
      return
    }
    router.push("/invoices?risk=HIGH")
  }

  return (
    <div className="rounded-xl border border-indigo-800 bg-indigo-950 p-5 text-indigo-50">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-indigo-300" />
        <h3 className="text-base font-semibold">AI Risk Intelligence</h3>
      </div>
      <p className="text-sm text-indigo-200/70">
        Portfolio risk assessment based on active invoices
      </p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-end justify-between">
          <span className="text-xs text-indigo-200/70">
            Average risk score
          </span>
          <span className="font-mono text-lg font-semibold">
            {risk.avgScore === null ? "—" : risk.avgScore}
            <span className="text-xs text-indigo-300/60"> / 100</span>
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-900">
          <div
            className={cn("h-full rounded-full transition-all", barColor(score))}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Legend label="Low risk" count={risk.low} dot="bg-emerald-400" />
        <Legend label="Medium risk" count={risk.medium} dot="bg-amber-400" />
        <Legend label="High risk" count={risk.high} dot="bg-red-400" />
      </div>

      <button
        type="button"
        onClick={runAnalysis}
        className="mt-5 w-full rounded-lg border border-indigo-700 bg-indigo-900/60 px-4 py-2 text-sm font-medium text-indigo-100 transition-colors hover:bg-indigo-900"
      >
        Run AI Analysis →
      </button>
    </div>
  )
}
