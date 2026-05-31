"use client"

import { useState } from "react"
import { Loader2, ExternalLink, ArrowRightLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ErrorMessage } from "@/components/shared/ErrorMessage"

const DESTINATIONS = [
  { value: "Ethereum_Sepolia", label: "Ethereum Sepolia" },
  { value: "Avalanche_Fuji", label: "Avalanche Fuji" },
]

interface CctpResponse {
  state: string
  txHash?: string
  explorerUrl?: string
  mock: boolean
}

function truncate(tx: string): string {
  return `${tx.slice(0, 10)}…${tx.slice(-6)}`
}

export function CctpDemo() {
  const [amount, setAmount] = useState("")
  const [destination, setDestination] = useState(DESTINATIONS[0].value)
  const [result, setResult] = useState<CctpResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)

    const value = Number(amount)
    if (!value || value <= 0) {
      setError("Enter an amount greater than 0.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/payments/cctp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, destinationChain: destination }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "The cross-chain transfer could not be completed.")
        return
      }
      setResult(json.data as CctpResponse)
    } catch {
      setError("The cross-chain transfer could not be completed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-400">
            <ArrowRightLeft className="h-4 w-4" />
            Cross-Border Transfer Demo
          </CardTitle>
          <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-400">
            Testnet Demo
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={send} className="space-y-4">
          {error && <ErrorMessage message={error} />}
          <p className="text-sm text-slate-400">
            Send USDC from Arc to another testnet via Circle CCTP — burned on
            Arc, minted on the destination chain.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cctp-amount">Amount (USDC)</Label>
              <Input
                id="cctp-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1.00"
                className="border-slate-700 bg-slate-800 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cctp-dest">Destination chain</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger
                  id="cctp-dest"
                  className="border-slate-700 bg-slate-800"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESTINATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send via CCTP
          </Button>
        </form>

        {result && (
          <div className="mt-4 space-y-2 border-t border-slate-800 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Transaction ID</span>
              {result.txHash ? (
                <a
                  href={result.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-emerald-400 hover:underline"
                >
                  {truncate(result.txHash)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-slate-300">{result.state}</span>
              )}
            </div>
            {result.mock && (
              <p className="text-xs text-amber-400/80">
                Simulated transfer — live CCTP isn&apos;t enabled for this
                Circle sandbox route.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
