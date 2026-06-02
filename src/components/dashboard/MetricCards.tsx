"use client"

import { motion } from "framer-motion"
import { TrendingUp, Zap, Clock, ShieldCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { cn } from "@/lib/utils"
import type { DashboardStats } from "@/hooks/useDashboard"

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
  accent?: boolean
  value: React.ReactNode
  sub: React.ReactNode
}

export function MetricCards({ stats }: { stats: DashboardStats }) {
  const cards: CardDef[] = [
    {
      label: "Total Financed",
      icon: TrendingUp,
      accent: true,
      value: (
        <USDCAmount
          baseUnits={BigInt(stats.totalFinanced)}
          size="xl"
          showSymbol={false}
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
        />
      ),
      sub: <>Across {stats.activeInvoices} active invoices</>,
    },
    {
      label: "Avg Settlement",
      icon: Clock,
      value: (
        <span className="font-mono text-3xl font-semibold text-slate-100">
          {stats.avgSettlementDays === null
            ? "—"
            : `${stats.avgSettlementDays.toFixed(1)} days`}
        </span>
      ),
      sub: <>Industry avg: 87 days</>,
    },
    {
      label: "On-Time Rate",
      icon: ShieldCheck,
      value: (
        <span className="font-mono text-3xl font-semibold text-slate-100">
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
            <Card
              className={cn(
                "h-full border text-slate-100",
                card.accent
                  ? "border-slate-800 border-l-2 border-l-emerald-500 bg-slate-950"
                  : "border-slate-800 bg-slate-900"
              )}
            >
              <CardContent className="flex h-full flex-col p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">
                    {card.label}
                  </span>
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      card.accent ? "text-emerald-400" : "text-slate-500"
                    )}
                  />
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
