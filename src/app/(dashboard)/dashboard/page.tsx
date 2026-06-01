"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { FilePlus2, Store, IdCard } from "lucide-react"
import { useDashboard } from "@/hooks/useDashboard"
import { StatsGrid } from "@/components/dashboard/StatsGrid"
import { LiveFlowChart } from "@/components/dashboard/LiveFlowChart"
import { RecentActivity } from "@/components/dashboard/RecentActivity"
import { CorridorMap } from "@/components/dashboard/CorridorMap"
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/hooks/useLanguage"

function LiveClock() {
  // Client-only to avoid an SSR/client hydration mismatch on the timestamp.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="font-mono text-sm text-slate-400 tabular-nums">
      {now ? format(now, "EEE, MMM d · HH:mm:ss") : "—"}
    </span>
  )
}

export default function DashboardPage() {
  const { data, loading, error } = useDashboard()
  const { t } = useLanguage()

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Your trade finance overview — USDC flows, risk, and settlement at a
            glance.
          </p>
        </div>
        <LiveClock />
      </div>

      {/* Three pillars — visible before data loads. */}
      <div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button
            asChild
            variant="outline"
            className="w-full justify-center border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-slate-100"
          >
            <Link href="/invoices">
              <FilePlus2 className="mr-2 h-4 w-4" />
              New Invoice
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full justify-center border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-slate-100"
          >
            <Link href="/marketplace">
              <Store className="mr-2 h-4 w-4" />
              Browse Marketplace
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full justify-center border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-slate-100"
          >
            <Link href="/passport">
              <IdCard className="mr-2 h-4 w-4" />
              My Credit Passport
            </Link>
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Submit invoices · access liquidity · build reputation
        </p>
      </div>

      {loading && <DashboardSkeleton />}

      {!loading && error && <ErrorMessage message={error} />}

      {!loading && data && (
        <>
          <StatsGrid stats={data.stats} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <LiveFlowChart flow={data.flow} />
            </div>
            <CorridorMap />
          </div>

          <RecentActivity items={data.recentActivity} />
        </>
      )}
    </div>
  )
}
