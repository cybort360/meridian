"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import confetti from "canvas-confetti"
import { motion, AnimatePresence } from "framer-motion"
import { Compass, Play, Check, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/constants"

type StepStatus = "pending" | "active" | "complete"
type StepData = Record<string, unknown>

interface StepView {
  status: StepStatus
  data: StepData | null
}

const STEP_COUNT = 5

function usd(baseUnits: unknown): string {
  try {
    const n = Number(BigInt(String(baseUnits))) / 1_000_000
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2,
    })
  } catch {
    return "$0"
  }
}

function truncate(addr: unknown): string {
  const s = String(addr ?? "")
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s
}

// Renders the human label for a step, filling in the live values once they
// arrive over SSE.
function stepLabel(step: number, data: StepData | null): string {
  switch (step) {
    case 1:
      return data
        ? `SME onboarded — wallet ${truncate(data.address)} created`
        : "SME onboarded + wallet created"
    case 2:
      return data
        ? `Invoice submitted — Freight forwarding Dubai → Riyadh, ${usd(data.amountUSDC)}`
        : "Invoice submitted — Freight forwarding Dubai → Riyadh"
    case 3:
      return data
        ? `AI risk engine scored → ${data.riskLabel} RISK, ${data.advanceRate}% advance rate`
        : "AI risk engine scoring…"
    case 4:
      return data
        ? `Investor funded — ${usd(data.advanceUSDC)} USDC disbursed to SME`
        : "Investor funds the invoice"
    case 5:
      return data
        ? `Invoice settled — investor repaid ${usd(data.repaidUSDC)} USDC`
        : "Invoice settled — investor repaid"
    default:
      return ""
  }
}

const CIRCLED = ["①", "②", "③", "④", "⑤"]

function freshSteps(): StepView[] {
  return Array.from({ length: STEP_COUNT }, () => ({
    status: "pending" as StepStatus,
    data: null,
  }))
}

export default function DemoPage() {
  const [steps, setSteps] = useState<StepView[]>(freshSteps)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [durationMs, setDurationMs] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    return () => esRef.current?.close()
  }, [])

  function fireConfetti() {
    const end = Date.now() + 800
    const tick = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors: ["#34d399", "#10b981", "#a7f3d0"],
      })
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors: ["#34d399", "#10b981", "#a7f3d0"],
      })
      if (Date.now() < end) requestAnimationFrame(tick)
    }
    tick()
  }

  function handleStep(step: number, data: StepData) {
    setSteps((prev) => {
      const next = prev.map((s, i) =>
        i === step - 1 ? { status: "complete" as StepStatus, data } : s
      )
      // Light up the next step as active.
      if (step < STEP_COUNT && next[step].status === "pending") {
        next[step] = { ...next[step], status: "active" }
      }
      return next
    })
  }

  function start() {
    setSteps(() => {
      const s = freshSteps()
      s[0] = { status: "active", data: null }
      return s
    })
    setDone(false)
    setDurationMs(null)
    setError(null)
    setRunning(true)

    const demoId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Math.random()).slice(2)

    const es = new EventSource(`/api/demo/events?id=${demoId}`)
    esRef.current = es

    es.onmessage = (e) => {
      let evt: { type?: string; step?: number; data?: StepData; durationMs?: number }
      try {
        evt = JSON.parse(e.data)
      } catch {
        return
      }
      if (evt.type === "ping") return
      if (evt.type === "connected") {
        // Connection is live — kick off the run.
        fetch("/api/demo/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demoId }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const j = await res.json().catch(() => ({}))
              setError(j.error ?? "The demo run could not be started.")
              setRunning(false)
              es.close()
            }
          })
          .catch(() => {
            setError("The demo run could not be started.")
            setRunning(false)
            es.close()
          })
        return
      }
      if (evt.type === "demo_step" && typeof evt.step === "number") {
        handleStep(evt.step, evt.data ?? {})
        return
      }
      if (evt.type === "demo_complete") {
        setDurationMs(evt.durationMs ?? null)
        setRunning(false)
        setDone(true)
        es.close()
        fireConfetti()
      }
    }

    es.onerror = () => {
      // EventSource auto-reconnects; surface an error only if nothing ran.
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-950 px-6 py-10 text-slate-100">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 ring-1 ring-emerald-400/20">
          <Compass className="h-5 w-5 text-emerald-400" />
        </span>
        <span className="text-xl font-semibold tracking-tight">{APP_NAME}</span>
        <span className="ml-2 rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
          Demo Autopilot
        </span>
      </div>

      <div className="mt-10 w-full max-w-xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          The full lifecycle, in one click
        </h1>
        <p className="mt-3 text-slate-400">
          Watch an invoice go from upload to AI scoring to funding to on-chain
          settlement — live.
        </p>

        {!running && !done && (
          <Button
            onClick={start}
            size="lg"
            className="mt-8 bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          >
            <Play className="mr-2 h-5 w-5 fill-slate-950" />
            Run Demo
          </Button>
        )}

        {error && (
          <p className="mt-6 rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>

      {/* Timeline */}
      {(running || done) && (
        <ol className="mt-12 w-full max-w-xl space-y-3">
          {steps.map((s, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`flex items-start gap-4 rounded-xl border px-4 py-4 transition-colors ${
                s.status === "complete"
                  ? "border-emerald-400/30 bg-emerald-400/5"
                  : s.status === "active"
                    ? "border-slate-600 bg-slate-900"
                    : "border-slate-800 bg-slate-900/50"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  s.status === "complete"
                    ? "bg-emerald-400/15 text-emerald-400"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {s.status === "complete" ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Check className="h-4 w-4" />
                  </motion.span>
                ) : s.status === "active" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                ) : (
                  <span>{CIRCLED[i]}</span>
                )}
              </span>
              <p
                className={`pt-1 text-sm ${
                  s.status === "pending" ? "text-slate-500" : "text-slate-100"
                }`}
              >
                {stepLabel(i + 1, s.data)}
              </p>
            </motion.li>
          ))}
        </ol>
      )}

      {/* Completion */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 flex flex-col items-center gap-4 text-center"
          >
            <p className="text-lg font-semibold text-emerald-400">
              Full lifecycle complete
              {durationMs !== null
                ? ` in ${(durationMs / 1000).toFixed(1)} seconds`
                : ""}
            </p>
            <div className="flex gap-3">
              <Link href="/dashboard">
                <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                  View Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={start}
                className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
              >
                Run again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
