import Link from "next/link"
import { AlertTriangle, Clock, XCircle } from "lucide-react"
import type { KycStatus } from "@prisma/client"
import { cn } from "@/lib/utils"

// Dashboard-wide verification banner. Renders nothing once APPROVED.
export function KycBanner({ status }: { status: KycStatus }) {
  if (status === "APPROVED") return null

  const config = {
    NOT_SUBMITTED: {
      icon: AlertTriangle,
      cls: "border-amber-500/30 bg-amber-950/60 text-amber-200",
      text: "Your business is not yet verified. Complete verification to start financing invoices.",
      cta: "Verify Now →",
    },
    PENDING_REVIEW: {
      icon: Clock,
      cls: "border-blue-500/30 bg-blue-950/60 text-blue-200",
      text: "Verification in progress - we'll notify you when approved.",
      cta: "Check Status →",
    },
    REJECTED: {
      icon: XCircle,
      cls: "border-red-500/30 bg-red-950/60 text-red-200",
      text: "Verification was not approved.",
      cta: "View reason and resubmit →",
    },
  }[status]

  if (!config) return null
  const Icon = config.icon

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2.5 text-sm md:px-6",
        config.cls
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{config.text}</span>
      <Link
        href="/kyc"
        className="font-medium underline underline-offset-2 hover:opacity-80"
      >
        {config.cta}
      </Link>
    </div>
  )
}
