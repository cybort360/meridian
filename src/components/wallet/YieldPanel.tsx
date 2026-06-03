"use client"

import { useState } from "react"
import { Loader2, Sprout, ArrowUpRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import { useYield } from "@/hooks/useYield"
import { arcTxUrl } from "@/lib/constants"

function ModeBadge({ mode }: { mode: "SIMULATED" | "REAL" }) {
  const isReal = mode === "REAL"
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] ${
        isReal
          ? "bg-emerald-400/10 text-emerald-400"
          : "bg-amber-400/10 text-amber-400"
      }`}
    >
      {isReal ? "Live · Sepolia" : "Simulated"}
    </span>
  )
}

export function YieldPanel() {
  const { summary, loading, error, pending, subscribe, redeem } = useYield()
  const [amount, setAmount] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  async function onAllocate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const value = Number(amount)
    if (!value || value <= 0) {
      setFormError("Enter an amount to allocate.")
      return
    }
    const err = await subscribe(value)
    if (err) setFormError(err)
    else setAmount("")
  }

  const apyPct = summary ? (summary.apyBps / 100).toFixed(2) : "—"

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Sprout className="h-4 w-4 text-emerald-400" />
          <CardTitle className="text-sm font-medium text-slate-400">
            Idle Capital · USYC Yield
          </CardTitle>
        </div>
        {summary && <ModeBadge mode={summary.mode} />}
      </CardHeader>

      <CardContent className="space-y-5">
        {error && <ErrorMessage message={error} />}

        {/* Headline stats */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
              APY
            </p>
            <p className="mt-1 font-mono text-xl font-semibold text-emerald-400">
              {apyPct}%
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
              In USYC
            </p>
            <USDCAmount
              baseUnits={BigInt(summary?.currentValueBase ?? "0")}
              size="lg"
              showSymbol={false}
              className="mt-1 block"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
              Yield earned
            </p>
            <USDCAmount
              baseUnits={BigInt(summary?.yieldEarnedBase ?? "0")}
              size="lg"
              showSymbol={false}
              className="mt-1 block"
            />
          </div>
        </div>

        {/* Allocate form */}
        <form onSubmit={onAllocate} className="space-y-2">
          {formError && <ErrorMessage message={formError} />}
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount to move into yield"
              className="border-slate-700 bg-slate-800 font-mono"
            />
            <Button
              type="submit"
              disabled={pending}
              className="shrink-0 bg-gold text-[#0C0D13] hover:bg-gold-bright"
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Move to yield
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Idle USDC earns the overnight T-bill rate via Circle USYC until you
            redeem it to fund an invoice.
          </p>
        </form>

        {/* Positions */}
        {!loading && summary && summary.positions.length > 0 && (
          <div className="space-y-2 border-t border-slate-800 pt-4">
            {summary.positions.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <USDCAmount
                      baseUnits={BigInt(p.currentValueBase)}
                      size="sm"
                      showSymbol={false}
                    />
                    <span className="text-xs text-emerald-400">
                      +<USDCAmount
                        baseUnits={BigInt(p.yieldEarnedBase)}
                        size="sm"
                        showSymbol={false}
                      />
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    Allocated {formatDistanceToNow(new Date(p.openedAt))} ago
                    {p.subscribeTxHash && (
                      <a
                        href={arcTxUrl(p.subscribeTxHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1 inline-flex items-center text-slate-400 hover:text-slate-200"
                      >
                        tx <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => redeem(p.id)}
                  className="shrink-0 border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
                >
                  Redeem
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
