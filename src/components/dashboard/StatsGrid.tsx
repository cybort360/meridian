"use client"

import { motion } from "framer-motion"
import { TrendingUp, FileClock, Gauge, CheckCircle2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { labelForScore } from "@/lib/utils/creditScore"
import type { DashboardStats } from "@/hooks/useDashboard"

interface StatDef {
  label: string
  icon: LucideIcon
  render: () => React.ReactNode
  trend: string
}

export function StatsGrid({ stats }: { stats: DashboardStats }) {
  const items: StatDef[] = [
    {
      label: "Total Volume Financed",
      icon: TrendingUp,
      trend: "Advanced to date",
      render: () => (
        <USDCAmount baseUnits={BigInt(stats.totalVolumeFinanced)} size="lg" />
      ),
    },
    {
      label: "Active Invoices",
      icon: FileClock,
      trend: "Capital in flight",
      render: () => (
        <span className="font-mono text-2xl font-semibold text-slate-100">
          {stats.activeInvoices}
        </span>
      ),
    },
    {
      label: "Credit Score",
      icon: Gauge,
      trend: `${labelForScore(stats.creditScore)} · 300–850`,
      render: () => (
        <span className="font-mono text-2xl font-semibold text-emerald-400">
          {stats.creditScore}
        </span>
      ),
    },
    {
      label: "On-Time Rate",
      icon: CheckCircle2,
      trend: "Settled vs. defaulted",
      render: () => (
        <span className="font-mono text-2xl font-semibold text-emerald-400">
          {stats.onTimeRate === null ? "—" : `${stats.onTimeRate}%`}
        </span>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item, i) => {
        const Icon = item.icon
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
          >
            <Card className="border-slate-800 bg-slate-900 text-slate-100">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">
                    {item.label}
                  </span>
                  <Icon className="h-4 w-4 text-slate-500" />
                </div>
                {item.render()}
                <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  <TrendingUp className="h-3 w-3 text-emerald-400/70" />
                  <span className="truncate">{item.trend}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
