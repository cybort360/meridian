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

const DESTINATIONS = ["Base_Sepolia", "Ethereum_Sepolia", "Arbitrum_Sepolia"]

interface CctpStep {
  name: string
  state: string
  txHash?: string
  explorerUrl?: string
}

export function CctpDemo() {
  const [amount, setAmount] = useState("")
  const [destination, setDestination] = useState(DESTINATIONS[0])
  const [steps, setSteps] = useState<CctpStep[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function bridge(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSteps(null)

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
      setSteps(json.data.steps ?? [])
    } catch {
      setError("The cross-chain transfer could not be completed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-400">
          <ArrowRightLeft className="h-4 w-4" />
          Cross-Border Demo (CCTP)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={bridge} className="space-y-4">
          {error && <ErrorMessage message={error} />}
          <p className="text-sm text-slate-400">
            Bridge USDC from Arc to another testnet via Circle CCTP — burned on
            Arc, minted on the destination.
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
              <Label htmlFor="cctp-dest">Destination</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger
                  id="cctp-dest"
                  className="border-slate-700 bg-slate-800"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESTINATIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d.replace(/_/g, " ")}
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
            Bridge USDC
          </Button>
        </form>

        {steps && (
          <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
            {steps.map((step) => (
              <div
                key={step.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="capitalize text-slate-300">{step.name}</span>
                <span className="flex items-center gap-2">
                  <span
                    className={
                      step.state === "success"
                        ? "text-emerald-400"
                        : step.state === "error"
                          ? "text-red-400"
                          : "text-amber-400"
                    }
                  >
                    {step.state}
                  </span>
                  {step.explorerUrl && (
                    <a
                      href={step.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-slate-300"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
