"use client"

import { useState } from "react"
import { FileText, Copy, Check, ExternalLink } from "lucide-react"
import { usePassport } from "@/hooks/usePassport"
import { CreditScore } from "@/components/passport/CreditScore"
import { HistoryTimeline } from "@/components/passport/HistoryTimeline"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PassportSkeleton } from "@/components/shared/Skeletons"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import { EmptyState } from "@/components/shared/EmptyState"
import { useLanguage } from "@/hooks/useLanguage"
import { ARC_EXPLORER_URL } from "@/lib/constants"

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function ArcAddressCard({
  address,
  blockchain,
}: {
  address: string | null
  blockchain: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">
          Your Arc Address
        </CardTitle>
      </CardHeader>
      <CardContent>
        {address ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-sm text-slate-200">
                {truncate(address)}
              </p>
              <a
                href={`${ARC_EXPLORER_URL}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
              >
                View on Arc explorer
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={copy}
              aria-label="Copy address"
              className="shrink-0 text-slate-400 hover:text-slate-100"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No wallet yet — create one on the Wallet page.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-600">{blockchain}</p>
      </CardContent>
    </Card>
  )
}

export default function PassportPage() {
  const { passport, loading, error } = usePassport()
  const { t } = useLanguage()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          {t("nav.passport")}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          A verifiable, on-chain financial identity built from every settled
          invoice.
        </p>
      </div>

      {loading && <PassportSkeleton />}

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
                <CreditScore score={passport.score} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
              <Stat label="Total Financed">
                <USDCAmount
                  baseUnits={BigInt(passport.totalVolumeUSDC)}
                  size="lg"
                />
              </Stat>
              <Stat label="On-Time Rate">
                <p className="font-mono text-2xl font-semibold text-emerald-400">
                  {passport.onTimeRate === null
                    ? "—"
                    : `${passport.onTimeRate}%`}
                </p>
              </Stat>
              <Stat label="Avg Days to Settle">
                <p className="font-mono text-2xl font-semibold text-slate-100">
                  {passport.avgDaysToSettle ?? "—"}
                </p>
              </Stat>
              <Stat label="Active Invoices">
                <p className="font-mono text-2xl font-semibold text-slate-100">
                  {passport.activeInvoices}
                </p>
              </Stat>
            </div>
          </div>

          <ArcAddressCard
            address={passport.address}
            blockchain={passport.blockchain}
          />

          <Card className="border-slate-800 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base">Invoice history</CardTitle>
            </CardHeader>
            <CardContent>
              {passport.invoices.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No invoices yet"
                  description="Create and finance an invoice to start building your passport."
                />
              ) : (
                <HistoryTimeline invoices={passport.invoices} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
