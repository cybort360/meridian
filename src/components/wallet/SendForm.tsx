"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import { transferSchema } from "@/lib/utils/validation"

export function SendForm({ onSuccess }: { onSuccess: () => void }) {
  const [toAddress, setToAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const parsed = transferSchema.safeParse({
      toAddress: toAddress.trim(),
      amount: Number(amount),
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/payments/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "The transfer could not be completed.")
        return
      }
      setSuccess(`Transfer ${json.data.state.toLowerCase()}.`)
      setToAddress("")
      setAmount("")
      onSuccess()
    } catch {
      setError("The transfer could not be completed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">
          Send USDC
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <ErrorMessage message={error} />}
          {success && (
            <p className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-400">
              {success}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="toAddress">Recipient address</Label>
            <Input
              id="toAddress"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x…"
              className="border-slate-700 bg-slate-800 font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USDC)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="border-slate-700 bg-slate-800 font-mono"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
