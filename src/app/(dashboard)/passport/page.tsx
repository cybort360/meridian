"use client"

import { History } from "lucide-react"
import { usePassport } from "@/hooks/usePassport"
import { CreditScore } from "@/components/passport/CreditScore"
import { HistoryTimeline } from "@/components/passport/HistoryTimeline"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import { EmptyState } from "@/components/shared/EmptyState"

export default function PassportPage() {
  const { passport, loading, error } = usePassport()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Credit Passport
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          A verifiable, on-chain financial identity built from every settled
          invoice.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <LoadingSpinner />
          Loading your passport…
        </div>
      )}

      {!loading && error && <ErrorMessage message={error} />}

      {!loading && passport && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border-slate-800 bg-slate-900 text-slate-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  Credit Score
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <CreditScore score={passport.creditScore} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
              <Card className="border-slate-800 bg-slate-900 text-slate-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">
                    Total Volume Financed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <USDCAmount
                    baseUnits={BigInt(passport.totalVolumeFinanced)}
                    size="lg"
                  />
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900 text-slate-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">
                    On-Time Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-2xl font-semibold text-emerald-400">
                    {passport.onTimeRate === null
                      ? "—"
                      : `${passport.onTimeRate}%`}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900 text-slate-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">
                    Invoices Financed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-2xl font-semibold text-slate-100">
                    {passport.invoicesFinanced}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900 text-slate-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">
                    Total Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-2xl font-semibold text-slate-100">
                    {passport.totalInvoices}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="border-slate-800 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base">Credit history</CardTitle>
            </CardHeader>
            <CardContent>
              {passport.events.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No credit events yet"
                  description="Settle a funded invoice to start building your passport."
                />
              ) : (
                <HistoryTimeline events={passport.events} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
