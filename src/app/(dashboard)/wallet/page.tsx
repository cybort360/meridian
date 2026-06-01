"use client"

import { Wallet as WalletIcon, Loader2, Receipt } from "lucide-react"
import { useWallet } from "@/hooks/useWallet"
import { BalanceCard } from "@/components/wallet/BalanceCard"
import { SendForm } from "@/components/wallet/SendForm"
import { TransactionRow } from "@/components/wallet/TransactionRow"
import { CctpDemo } from "@/components/wallet/CctpDemo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WalletSkeleton } from "@/components/shared/Skeletons"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import { EmptyState } from "@/components/shared/EmptyState"
import { useLanguage } from "@/hooks/useLanguage"

export default function WalletPage() {
  const { t } = useLanguage()
  const {
    wallet,
    transactions,
    loading,
    error,
    hasWallet,
    creating,
    createWallet,
    refetch,
  } = useWallet()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          {t("nav.wallet")}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Your Circle wallet on Arc testnet. USDC is the native gas token.
        </p>
      </div>

      {loading && <WalletSkeleton />}

      {!loading && hasWallet === false && (
        <EmptyState
          icon={WalletIcon}
          title="No wallet yet"
          description="Create your Circle wallet on Arc to start receiving and sending USDC."
        >
          <div className="space-y-3">
            {error && <ErrorMessage message={error} />}
            <Button
              onClick={createWallet}
              disabled={creating}
              className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create wallet
            </Button>
          </div>
        </EmptyState>
      )}

      {!loading && hasWallet && error && (
        <div className="space-y-3">
          <ErrorMessage message={error} />
          <Button
            variant="outline"
            onClick={refetch}
            className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
          >
            Retry
          </Button>
        </div>
      )}

      {!loading && wallet && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BalanceCard wallet={wallet} onRefetch={refetch} />
            <SendForm onSuccess={refetch} />
          </div>

          <CctpDemo />

          <Card className="border-slate-800 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base">Transaction history</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No transactions yet"
                  description="Fund your wallet from the Arc faucet, then send USDC to see activity here."
                />
              ) : (
                <div>
                  {transactions.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
