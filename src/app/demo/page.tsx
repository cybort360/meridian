"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import confetti from "canvas-confetti"
import { motion, AnimatePresence } from "framer-motion"
import {
  Compass,
  Play,
  Check,
  Loader2,
  ArrowRight,
  ArrowUp,
  Banknote,
  TrendingUp,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/constants"

type StepStatus = "pending" | "active" | "complete"
type StepData = Record<string, unknown>

interface StepView {
  status: StepStatus
  data: StepData | null
}

const STEP_COUNT = 5

// Step 6 ("Credit Passport updated") is a frontend-only flourish that runs after
// the backend's demo_complete — it animates a credit-score counter rather than
// reflecting a new SSE event.
const PASSPORT_FROM = 540
const PASSPORT_TO = 556

// Curated outcome figures for the completion summary. These match the demo's
// scripted path ($8,500 invoice · 82% advance · 2% yield) and the +16 score gain.
const OUTCOMES = [
  {
    icon: Banknote,
    label: "Capital disbursed",
    value: "$6,970",
    detail: "USDC to SME",
  },
  {
    icon: TrendingUp,
    label: "Investor yield",
    value: "$139.40",
    detail: "USDC returned",
  },
  {
    icon: ShieldCheck,
    label: "Reputation built",
    value: "+16",
    detail: "credit points",
  },
] as const

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
  // Step 6 (credit passport) state — driven locally, not over SSE.
  const [passport, setPassport] = useState<StepStatus>("pending")
  const [score, setScore] = useState(PASSPORT_FROM)
  const esRef = useRef<EventSource | null>(null)
  const scoreTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      esRef.current?.close()
      if (scoreTimerRef.current) clearInterval(scoreTimerRef.current)
    }
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

  // Step 6: animate the credit passport once the lifecycle settles. The checkmark
  // lands first, then the score counts up from 540 to 556 (one point / 50ms);
  // completion (cards + confetti) is held until the counter finishes.
  function runPassportStep() {
    setPassport("active")
    setScore(PASSPORT_FROM)
    window.setTimeout(() => {
      setPassport("complete")
      let current = PASSPORT_FROM
      scoreTimerRef.current = setInterval(() => {
        current += 1
        setScore(current)
        if (current >= PASSPORT_TO) {
          if (scoreTimerRef.current) clearInterval(scoreTimerRef.current)
          scoreTimerRef.current = null
          setRunning(false)
          setDone(true)
          fireConfetti()
        }
      }, 50)
    }, 700)
  }

  function start() {
    if (scoreTimerRef.current) {
      clearInterval(scoreTimerRef.current)
      scoreTimerRef.current = null
    }
    setSteps(() => {
      const s = freshSteps()
      s[0] = { status: "active", data: null }
      return s
    })
    setPassport("pending")
    setScore(PASSPORT_FROM)
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
        es.close()
        // Hand off to the frontend-only passport step; it finishes the run.
        runPassportStep()
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
            className="mt-8 bg-gold text-[#0C0D13] hover:bg-gold-bright"
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

          {/* Step 6 — credit passport (frontend-animated). */}
          <motion.li
            key="passport"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: STEP_COUNT * 0.05 }}
            className={`flex items-start gap-4 rounded-xl border px-4 py-4 transition-colors ${
              passport === "complete"
                ? "border-emerald-400/30 bg-emerald-400/5"
                : passport === "active"
                  ? "border-slate-600 bg-slate-900"
                  : "border-slate-800 bg-slate-900/50"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                passport === "complete"
                  ? "bg-emerald-400/15 text-emerald-400"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {passport === "complete" ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <Check className="h-4 w-4" />
                </motion.span>
              ) : passport === "active" ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              ) : (
                <span>⑥</span>
              )}
            </span>
            <div className="pt-1">
              <p
                className={`text-sm ${
                  passport === "pending" ? "text-slate-500" : "text-slate-100"
                }`}
              >
                Credit Passport updated
              </p>
              {passport === "complete" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400"
                >
                  <span>Score {PASSPORT_FROM} →</span>
                  <span className="inline-flex items-center gap-0.5 font-mono font-semibold tabular-nums text-emerald-400">
                    <ArrowUp className="h-3 w-3" />
                    {score}
                  </span>
                  <span>· +1 verified trade event · Repayment reliability: 100%</span>
                </motion.p>
              )}
            </div>
          </motion.li>
        </ol>
      )}

      {/* Completion */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 flex w-full max-w-xl flex-col items-center gap-5 text-center"
          >
            <div>
              <p className="text-lg font-semibold text-emerald-400">
                Settlement complete. Credit reputation strengthened. The network
                learned.
              </p>
              {durationMs !== null && (
                <p className="mt-1 text-xs text-slate-500">
                  {(durationMs / 1000).toFixed(1)}s end-to-end
                </p>
              )}
            </div>

            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
              {OUTCOMES.map((o) => {
                const Icon = o.icon
                return (
                  <div
                    key={o.label}
                    className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-4 text-left"
                  >
                    <div className="flex items-center gap-2 text-slate-400">
                      <Icon className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-medium uppercase tracking-wide">
                        {o.label}
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-semibold text-slate-100">
                      {o.value}
                    </p>
                    <p className="text-xs text-slate-500">{o.detail}</p>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3">
              <Link href="/dashboard">
                <Button className="bg-gold text-[#0C0D13] hover:bg-gold-bright">
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
