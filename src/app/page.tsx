import Link from "next/link"
import { Compass, Zap, ShieldCheck, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/constants"

const FEATURES = [
  {
    icon: Zap,
    title: "Instant capital",
    body: "Upload an unpaid invoice and receive USDC-backed working capital in seconds, not weeks.",
  },
  {
    icon: ShieldCheck,
    title: "AI risk scoring",
    body: "Every invoice is scored in real time, giving investors transparent, explainable risk.",
  },
  {
    icon: Globe,
    title: "On-chain settlement",
    body: "Repayments route automatically in USDC on Arc — verifiable, borderless, and fast.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 ring-1 ring-emerald-400/20">
            <Compass className="h-5 w-5 text-emerald-400" />
          </span>
          <span className="text-xl font-semibold tracking-tight">
            {APP_NAME}
          </span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login">
            <Button
              variant="ghost"
              className="text-slate-300 hover:text-slate-100"
            >
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              Get Started
            </Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-20 text-center sm:py-28">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-emerald-400">
            AI-native trade finance
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Instant USDC-backed capital for UAE SMEs
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Turn unpaid invoices into working capital today. {APP_NAME} scores
            risk with AI, funds you in USDC, and builds your on-chain credit
            passport with every transaction.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button
                size="lg"
                className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 sm:w-auto"
              >
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800 sm:w-auto"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 pb-24 md:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10 ring-1 ring-emerald-400/20">
                  <Icon className="h-5 w-5 text-emerald-400" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{f.body}</p>
              </div>
            )
          })}
        </section>
      </main>
    </div>
  )
}
