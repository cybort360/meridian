"use client"

import { useEffect, useState } from "react"
import { Copy, Check, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { ARC_FAUCET_URL } from "@/lib/constants"
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates"
import { cn } from "@/lib/utils"
import type { WalletData } from "@/hooks/useWallet"

function truncate(address: string): string {
  return address.length > 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address
}

export function BalanceCard({
  wallet,
  onRefetch,
}: {
  wallet: WalletData
  onRefetch?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [flash, setFlash] = useState(false)
  const [showUpdated, setShowUpdated] = useState(false)
  const { lastEvent } = useRealtimeUpdates()

  // React to a live balance update for this wallet.
  useEffect(() => {
    if (!lastEvent || lastEvent.type !== "balance_update") return
    if (lastEvent.walletId && lastEvent.walletId !== wallet.circleWalletId) return

    onRefetch?.()
    setFlash(true)
    setShowUpdated(true)
    const flashTimer = setTimeout(() => setFlash(false), 1200)
    const labelTimer = setTimeout(() => setShowUpdated(false), 3000)
    return () => {
      clearTimeout(flashTimer)
      clearTimeout(labelTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent])

  async function copyAddress() {
    await navigator.clipboard.writeText(wallet.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card
      className={cn(
        "border-slate-800 bg-slate-900 text-slate-100 transition-colors duration-1000",
        flash && "border-emerald-400/40 bg-emerald-400/10"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-slate-400">
          USDC Balance
          <span
            className={cn(
              "text-xs font-normal text-emerald-400 transition-opacity duration-700",
              showUpdated ? "opacity-100" : "opacity-0"
            )}
          >
            Updated just now
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <USDCAmount baseUnits={BigInt(wallet.usdcBalanceRaw)} size="xl" />

        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">
              Wallet address · {wallet.blockchain}
            </p>
            <p className="truncate font-mono text-sm text-slate-300">
              {truncate(wallet.address)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyAddress}
            className="shrink-0 text-slate-400 hover:text-slate-100"
            aria-label="Copy wallet address"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <a
          href={ARC_FAUCET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline"
        >
          Fund this wallet from the Arc faucet
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </CardContent>
    </Card>
  )
}
