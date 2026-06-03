"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface VerifyData {
  invoiceNumber: string
  amountUSDC: string
}

function VerifyContent() {
  const token = useSearchParams().get("token")
  const [state, setState] = useState<"loading" | "success" | "error">("loading")
  const [data, setData] = useState<VerifyData | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const run = useCallback(async () => {
    if (!token) {
      setState("error")
      setErrorMsg("This verification link is missing its token.")
      return
    }
    try {
      const res = await fetch(
        `/api/invoices/verify?token=${encodeURIComponent(token)}`
      )
      const json = await res.json()
      if (!res.ok) {
        setState("error")
        setErrorMsg(
          json.error === "Already verified"
            ? "This invoice has already been confirmed."
            : json.error ?? "This link is invalid or has expired."
        )
        return
      }
      setData(json.data as VerifyData)
      setState("success")
    } catch {
      setState("error")
      setErrorMsg("Something went wrong. Please try again.")
    }
  }, [token])

  // Verify exactly once per mount (avoids React StrictMode's double-invoke,
  // which would otherwise fire a second request and hit "Already verified").
  const hasRun = useRef(false)
  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true
    run()
  }, [run])

  if (state === "loading") {
    return (
      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardContent className="flex items-center justify-center gap-2 py-12 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Confirming invoice…
        </CardContent>
      </Card>
    )
  }

  if (state === "success") {
    return (
      <Card className="border-emerald-400/20 bg-slate-900 text-slate-100">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <h1 className="text-lg font-semibold text-slate-100">
            Invoice confirmed
          </h1>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            You have confirmed invoice{" "}
            <span className="font-medium text-slate-200">
              #{data?.invoiceNumber}
            </span>{" "}
            for{" "}
            <span className="font-mono text-emerald-400">
              USDC {data?.amountUSDC}
            </span>
            . The supplier can now access financing against it.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-red-400/20 bg-slate-900 text-slate-100">
      <CardContent className="flex flex-col items-center py-10 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-400/10 text-red-400">
          <XCircle className="h-8 w-8" />
        </span>
        <h1 className="text-lg font-semibold text-slate-100">
          Couldn&apos;t confirm this invoice
        </h1>
        <p className="mt-2 max-w-sm text-sm text-slate-400">{errorMsg}</p>
      </CardContent>
    </Card>
  )
}

export default function VerifyInvoicePage() {
  return (
    <div className="dark flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold">
          <span className="font-sora text-lg font-bold text-[#0C0D13]">M</span>
        </span>
        <span className="font-sora text-2xl font-bold tracking-tight text-slate-100">
          Meridian
        </span>
      </Link>
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <Card className="border-slate-800 bg-slate-900 text-slate-100">
              <CardContent className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </CardContent>
            </Card>
          }
        >
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  )
}
