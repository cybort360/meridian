"use client"

import { motion } from "framer-motion"
import { TrendingUp, FileClock, Gauge, CheckCircle2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { USDCAmount } from "@/components/shared/USDCAmount"
import type { DashboardStats } from "@/hooks/useDashboard"

interface StatDef {
  label: string
  icon: LucideIcon
  render: () => React.ReactNode
}

export function StatsGrid({ stats }: { stats: DashboardStats }) {
  const items: StatDef[] = [
    {
      label: "Total Volume Financed",
      icon: TrendingUp,
      render: () => (
        <USDCAmount
          baseUnits={BigInt(stats.totalVolumeFinanced)}
          size="lg"
        />
      ),
    },
    {
      label: "Active Invoices",
      icon: FileClock,
      render: () => (
        <span className="font-mono text-2xl font-semibold text-slate-100">
          {stats.activeInvoices}
        </span>
      ),
    },
    {
      label: "Average Risk Score",
      icon: Gauge,
      render: () => (
        <span className="font-mono text-2xl font-semibold text-slate-100">
          {stats.avgRiskScore ?? "—"}
        </span>
      ),
    },
    {
      label: "On-Time Rate",
      icon: CheckCircle2,
      render: () => (
        <span className="font-mono text-2xl font-semibold text-emerald-400">
          {stats.onTimeRate === null ? "—" : `${stats.onTimeRate}%`}
        </span>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => {
        const Icon = item.icon
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
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
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
