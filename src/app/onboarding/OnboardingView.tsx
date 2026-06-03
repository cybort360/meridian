"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Compass,
  FileText,
  Zap,
  ShieldCheck,
  ArrowRight,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/constants"

interface Step {
  icon: LucideIcon
  title: string
  description: string
}

const STEPS: Step[] = [
  {
    icon: FileText,
    title: "Submit invoices",
    description: "Upload unpaid invoices. Our AI scores them for risk in seconds.",
  },
  {
    icon: Zap,
    title: "Access liquidity",
    description:
      "Get up to 90% of your invoice value in USDC — instantly, not in 90 days.",
  },
  {
    icon: ShieldCheck,
    title: "Build reputation",
    description:
      "Every settled invoice strengthens your on-chain Credit Passport. Better history means better rates.",
  },
]

export function OnboardingView() {
  const router = useRouter()
  const [finishing, setFinishing] = useState(false)

  // Mark onboarding as seen, then continue. Navigate regardless of the PATCH
  // result so a transient API error never traps the user on this screen.
  async function finish() {
    setFinishing(true)
    try {
      await fetch("/api/user/onboarding", { method: "PATCH" })
    } catch {
      // non-fatal — proceed to the dashboard anyway
    }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-950 px-6 py-10 text-slate-100">
      {/* Skip — top-right */}
      <div className="flex w-full max-w-xl items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 ring-1 ring-emerald-400/20">
            <Compass className="h-5 w-5 text-emerald-400" />
          </span>
          <span className="text-xl font-semibold tracking-tight">{APP_NAME}</span>
        </div>
        <button
          type="button"
          onClick={finish}
          disabled={finishing}
          className="text-sm text-slate-500 transition-colors hover:text-slate-300"
        >
          Skip
        </button>
      </div>

      <div className="mt-12 w-full max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          How Meridian works
        </h1>
        <p className="mt-3 text-slate-400">
          Three steps turn an unpaid invoice into capital today — and credit for
          tomorrow.
        </p>

        {/* Three steps, vertical */}
        <ol className="mt-10 space-y-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <li
                key={step.title}
                className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900 px-5 py-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/20">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      {i + 1}
                    </span>
                    <h2 className="text-base font-semibold text-slate-100">
                      {step.title}
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {step.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>

        {/* Flywheel sentence */}
        <p className="mt-8 text-lg font-medium leading-relaxed text-slate-200">
          Meridian finances your invoices today and builds the credit reputation
          that earns you better terms tomorrow.
        </p>

        {/* CTA */}
        <Button
          onClick={finish}
          disabled={finishing}
          size="lg"
          className="mt-8 w-full bg-gold text-[#0C0D13] hover:bg-gold-bright sm:w-auto"
        >
          {finishing ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : null}
          Start building your credit history
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
