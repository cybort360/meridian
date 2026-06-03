"use client"

import { motion } from "framer-motion"
import { TrendingUp, Zap, Clock, ShieldCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { cn } from "@/lib/utils"
import type { DashboardStats } from "@/hooks/useDashboard"

// Big metric number: full size when a card is wide (1–2 up), steps down at the
// cramped 4-up `lg` width, then back up once `xl` gives the cards room again.
const NUM = "text-3xl lg:text-2xl xl:text-3xl"

function Trend({ value, suffix }: { value: number; suffix: string }) {
  const up = value >= 0
  return (
    <span className={cn(up ? "text-emerald-400" : "text-red-400")}>
      {up ? "↑" : "↓"} {up ? "+" : ""}
      {value}
      {suffix}
    </span>
  )
}

interface CardDef {
  label: string
  icon: LucideIcon
  value: React.ReactNode
  sub: React.ReactNode
}

export function MetricCards({ stats }: { stats: DashboardStats }) {
  const cards: CardDef[] = [
    {
      label: "Total Financed",
      icon: TrendingUp,
      value: (
        <USDCAmount
          baseUnits={BigInt(stats.totalFinanced)}
          size="xl"
          showSymbol={false}
          className={NUM}
        />
      ),
      sub: (
        <>
          vs. last month{" "}
          <Trend value={stats.totalFinancedChangePct} suffix="%" />
        </>
      ),
    },
    {
      label: "Capital Deployed",
      icon: Zap,
      value: (
        <USDCAmount
          baseUnits={BigInt(stats.capitalDeployed)}
          size="xl"
          showSymbol={false}
          className={NUM}
        />
      ),
      sub: <>Across {stats.activeInvoices} active invoices</>,
    },
    {
      label: "Avg Settlement",
      icon: Clock,
      value: (
        <span className={cn("font-mono font-semibold text-slate-100", NUM)}>
          {stats.avgSettlementDays === null ? (
            "—"
          ) : (
            <>
              {stats.avgSettlementDays.toFixed(1)}
              <span className="ml-1 text-base font-normal text-slate-400">
                days
              </span>
            </>
          )}
        </span>
      ),
      sub: <>Industry avg: 87 days</>,
    },
    {
      label: "On-Time Rate",
      icon: ShieldCheck,
      value: (
        <span className={cn("font-mono font-semibold text-slate-100", NUM)}>
          {stats.onTimeRate === null ? "—" : `${stats.onTimeRate}%`}
        </span>
      ),
      sub: (
        <>
          <Trend value={stats.onTimePointsThisMonth} suffix=" points" /> this
          month
        </>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08, ease: "easeOut" }}
            className="h-full"
          >
            <Card className="h-full border border-slate-800 bg-slate-900 text-slate-100">
              <CardContent className="flex h-full flex-col p-5">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                    {card.label}
                  </span>
                  <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                </div>
                <div className="leading-none">{card.value}</div>
                <p className="mt-auto pt-3 text-xs text-slate-500">{card.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
