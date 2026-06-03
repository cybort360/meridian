"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Download, Loader2 } from "lucide-react"
import { useDashboard } from "@/hooks/useDashboard"
import { useProfile } from "@/hooks/useProfile"
import { generateStatementPdf } from "@/lib/pdf/statement"
import { MetricCards } from "@/components/dashboard/MetricCards"
import { MonthSelector } from "@/components/dashboard/MonthSelector"
import { SecondaryStats } from "@/components/dashboard/SecondaryStats"
import { FlowChart } from "@/components/dashboard/FlowChart"
import { InvoicePipeline } from "@/components/dashboard/InvoicePipeline"
import { ActivityPanel } from "@/components/dashboard/ActivityPanel"
import { RiskIntelligence } from "@/components/dashboard/RiskIntelligence"
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import { Button } from "@/components/ui/button"

function WelcomeDate({ company }: { company: string | null }) {
  // Client-only to avoid an SSR/client hydration mismatch on the date.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])

  return (
    <p className="mt-1 text-sm text-slate-400">
      {now ? format(now, "EEEE, MMMM do, yyyy") : "—"}
      {company ? ` · ${company}` : ""}
    </p>
  )
}

export default function DashboardPage() {
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"))
  const { data, loading, error } = useDashboard(month)
  const { profile } = useProfile()
  const [exporting, setExporting] = useState(false)

  // Builds a formatted bank-statement PDF for the selected month: summary
  // figures + a line-by-line Money In / Money Out ledger.
  async function exportPdf() {
    if (!data || exporting) return
    setExporting(true)
    try {
      const res = await fetch(`/api/dashboard/statement?month=${month}`)
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "Could not build the statement.")
        return
      }
      generateStatementPdf({
        account: json.data.account,
        monthLabel: format(new Date(`${month}-01T00:00:00`), "MMMM yyyy"),
        generatedAt: new Date(),
        stats: data.stats,
        secondary: data.secondary,
        transactions: json.data.transactions,
      })
    } catch {
      toast.error("Could not build the statement.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
            Welcome back, {profile?.name ?? "there"}
          </h1>
          <WelcomeDate company={profile?.companyName ?? null} />
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <MonthSelector value={month} onChange={setMonth} />
          <Button
            onClick={exportPdf}
            disabled={exporting || !data}
            className="bg-gold text-[#0C0D13] hover:bg-gold-bright"
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>
        </div>
      </div>

      {loading && <DashboardSkeleton />}

      {!loading && error && <ErrorMessage message={error} />}

      {!loading && data && (
        <>
          <MetricCards stats={data.stats} />
          <SecondaryStats secondary={data.secondary} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Left column (≈65%) */}
            <div className="space-y-4 lg:col-span-2">
              <FlowChart
                flow={data.monthlyFlow}
                onTimeRate={data.stats.onTimeRate}
              />
              <InvoicePipeline invoices={data.pipeline} />
            </div>

            {/* Right column (≈35%) — fades in after the cards */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
              className="space-y-4"
            >
              <ActivityPanel items={data.recentActivity} />
              <RiskIntelligence risk={data.risk} />
            </motion.div>
          </div>
        </>
      )}
    </div>
  )
}
