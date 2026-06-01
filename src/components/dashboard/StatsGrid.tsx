"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { TrendingUp, FileClock, Gauge, CheckCircle2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { useLanguage } from "@/hooks/useLanguage"
import type { DashboardStats } from "@/hooks/useDashboard"

interface StatDef {
  label: string
  icon: LucideIcon
  render: () => React.ReactNode
  trend?: string
  // When present, replaces the default trend line (used by the Credit Score card).
  extra?: () => React.ReactNode
}

function creditChangeLabel(change: number): { text: string; className: string } {
  if (change > 0) {
    return { text: `↑ +${change} this month`, className: "text-emerald-400" }
  }
  if (change < 0) {
    return { text: `↓ ${change} this month`, className: "text-red-400" }
  }
  return { text: "Stable", className: "text-slate-400" }
}

export function StatsGrid({ stats }: { stats: DashboardStats }) {
  const { t } = useLanguage()
  const change = creditChangeLabel(stats.creditScoreChange30d)

  const items: StatDef[] = [
    {
      label: t("dashboard.totalFinanced"),
      icon: TrendingUp,
      trend: "Advanced to date",
      render: () => (
        <USDCAmount baseUnits={BigInt(stats.totalVolumeFinanced)} size="lg" />
      ),
    },
    {
      label: t("dashboard.activeInvoices"),
      icon: FileClock,
      trend: "Capital in flight",
      render: () => (
        <span className="font-mono text-2xl font-semibold text-slate-100">
          {stats.activeInvoices}
        </span>
      ),
    },
    {
      label: t("dashboard.creditScore"),
      icon: Gauge,
      render: () => (
        <span className="font-mono text-2xl font-semibold text-emerald-400">
          {stats.creditScore}
        </span>
      ),
      extra: () => (
        <div className="space-y-1.5">
          <p className={`text-xs font-medium ${change.className}`}>
            {change.text}
          </p>
          <p className="text-xs text-slate-500">
            ✓ {stats.settledInvoices} settled invoices &nbsp;·&nbsp;{" "}
            {stats.repaymentRate}% repayment rate
          </p>
          <Link
            href="/passport"
            className="inline-block text-xs text-emerald-400 hover:underline"
          >
            View full passport →
          </Link>
        </div>
      ),
    },
    {
      label: t("dashboard.onTimeRate"),
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
            className="h-full"
          >
            <Card className="h-full border-slate-800 bg-slate-900 text-slate-100">
              <CardContent className="flex h-full flex-col p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">
                    {item.label}
                  </span>
                  <Icon className="h-4 w-4 text-slate-500" />
                </div>
                {item.render()}
                {/* Footer pinned to the bottom so trend/stat lines align across cards. */}
                <div className="mt-auto pt-3">
                  {item.extra ? (
                    item.extra()
                  ) : item.trend ? (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <TrendingUp className="h-3 w-3 text-emerald-400/70" />
                      <span className="truncate">{item.trend}</span>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
