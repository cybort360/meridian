"use client"

import { motion } from "framer-motion"
import { fromUSDCBaseUnits, formatUSDC } from "@/lib/utils/usdc"
import { cn } from "@/lib/utils"
import type { SecondaryStats as Stats } from "@/hooks/useDashboard"

function money(baseUnits: string): string {
  return `$${formatUSDC(fromUSDCBaseUnits(BigInt(baseUnits)))}`
}

function Pill({
  dot,
  label,
  count,
  amount,
  trend,
}: {
  dot: string
  label: string
  count: number
  amount: string
  trend?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-sm">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />
      <span className="text-slate-400">{label}:</span>
      <span className="font-medium text-slate-200">{count}</span>
      <span className="font-mono text-slate-300">{money(amount)}</span>
      {trend && <span className="text-xs">{trend}</span>}
    </div>
  )
}

export function SecondaryStats({ secondary }: { secondary: Stats }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.32, ease: "easeOut" }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      <Pill
        dot="bg-emerald-400"
        label="Paid Invoices"
        count={secondary.paid.count}
        amount={secondary.paid.amount}
        trend={
          <span
            className={
              secondary.paid.changePct >= 0
                ? "text-emerald-400"
                : "text-red-400"
            }
          >
            {secondary.paid.changePct >= 0 ? "↑" : "↓"}
            {secondary.paid.changePct >= 0 ? "+" : ""}
            {secondary.paid.changePct}% from last month
          </span>
        }
      />
      <Pill
        dot="bg-amber-400"
        label="Due Invoices"
        count={secondary.due.count}
        amount={secondary.due.amount}
      />
      <Pill
        dot="bg-red-400"
        label="Overdue Invoices"
        count={secondary.overdue.count}
        amount={secondary.overdue.amount}
        trend={
          secondary.overdue.thisWeek > 0 ? (
            <span className="text-red-400">
              ↓ {secondary.overdue.thisWeek} this week
            </span>
          ) : (
            <span className="text-slate-500">none this week</span>
          )
        }
      />
    </motion.div>
  )
}
