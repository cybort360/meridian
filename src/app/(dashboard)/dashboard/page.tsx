"use client"

import { useSession } from "next-auth/react"
import { useDashboard } from "@/hooks/useDashboard"
import { StatsGrid } from "@/components/dashboard/StatsGrid"
import { LiveFlowChart } from "@/components/dashboard/LiveFlowChart"
import { RecentActivity } from "@/components/dashboard/RecentActivity"
import { CorridorMap } from "@/components/dashboard/CorridorMap"
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton"
import { ErrorMessage } from "@/components/shared/ErrorMessage"

export default function DashboardPage() {
  const { data: session } = useSession()
  const { data, loading, error } = useDashboard()

  const firstName = session?.user?.name?.split(" ")[0] ?? "there"

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Your trade finance overview — USDC flows, risk, and settlement at a
          glance.
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
