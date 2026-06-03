"use client"

import { useState } from "react"
import { Loader2, Layers } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import { useGateway } from "@/hooks/useGateway"

export function UnifiedBalanceCard() {
  const { balance, loading, error, pending, deposit, withdraw } = useGateway()
  const [amount, setAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const hasBalance = BigInt(balance?.totalUSDCRaw ?? "0") > 0n

  async function onDeposit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setNotice(null)
    const value = Number(amount)
    if (!value || value <= 0) {
      setFormError("Enter an amount to deposit.")
      return
    }
    const err = await deposit(value)
    if (err) setFormError(err)
    else {
      setAmount("")
      setNotice("Deposit confirmed — your unified balance will update shortly.")
    }
  }

  async function onWithdraw(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setNotice(null)
    const value = Number(withdrawAmount)
    if (!value || value <= 0) {
      setFormError("Enter an amount to bring back.")
      return
    }
    const err = await withdraw(value)
    if (err) setFormError(err)
    else {
      setWithdrawAmount("")
      setNotice("On its way — USDC is being minted back to your Arc wallet.")
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-gold" />
          <CardTitle className="text-sm font-medium text-slate-400">
            Unified USDC Balance · Gateway
          </CardTitle>
        </div>
        <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-gold">
          Cross-chain
        </span>
      </CardHeader>

      <CardContent className="space-y-5">
        {error && <ErrorMessage message={error} />}

        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            Available across all chains
          </p>
          <USDCAmount
            baseUnits={BigInt(balance?.totalUSDCRaw ?? "0")}
            size="xl"
            showSymbol={false}
            className="mt-1 block"
          />
          {balance && balance.perDomain.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              {balance.perDomain.length} chain
              {balance.perDomain.length === 1 ? "" : "s"} contributing
            </p>
          )}
        </div>

        <form onSubmit={onDeposit} className="space-y-2">
          {formError && <ErrorMessage message={formError} />}
          {notice && (
            <p className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-400">
              {notice}
            </p>
          )}
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount to deposit"
              className="border-slate-700 bg-slate-800 font-mono"
            />
            <Button
              type="submit"
              disabled={pending || loading}
              className="shrink-0 bg-gold text-[#0C0D13] hover:bg-gold-bright"
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deposit
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Deposit USDC into Circle Gateway for instant, cross-chain liquidity
            to fund invoices on any supported chain.
          </p>
        </form>

        {/* Withdraw — burn the unified balance and mint USDC back to Arc. */}
        <form onSubmit={onWithdraw} className="space-y-2 border-t border-slate-800 pt-4">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Amount to bring back to Arc"
              className="border-slate-700 bg-slate-800 font-mono"
            />
            <Button
              type="submit"
              variant="outline"
              disabled={pending || loading || !hasBalance}
              className="shrink-0 border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Bring to Arc
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Burns from your unified balance and mints USDC straight back to your
            Arc wallet — 1:1, no swap.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
