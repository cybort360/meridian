import { ArrowDownLeft, ArrowUpRight, ExternalLink } from "lucide-react"
import { arcTxUrl } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { WalletTransaction, CircleTransactionState } from "@/types/circle"

const STATE_STYLE: Record<CircleTransactionState, string> = {
  INITIATED: "text-slate-400",
  QUEUED: "text-slate-400",
  SENT: "text-amber-400",
  CONFIRMED: "text-emerald-400",
  COMPLETE: "text-emerald-400",
  FAILED: "text-red-400",
  CANCELLED: "text-red-400",
  DENIED: "text-red-400",
}

function truncate(value?: string): string {
  if (!value) return "—"
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value
}

export function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const inbound = tx.direction === "INBOUND"
  const Icon = inbound ? ArrowDownLeft : ArrowUpRight

  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-800 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            inbound
              ? "bg-emerald-400/10 text-emerald-400"
              : "bg-slate-800 text-slate-300"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-200">
            {inbound ? "Received" : "Sent"}
          </p>
          <p className="truncate font-mono text-xs text-slate-500">
            {inbound ? "from" : "to"} {truncate(tx.counterpartyAddress)}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end">
        <span
          className={cn(
            "font-mono text-sm font-semibold",
            inbound ? "text-emerald-400" : "text-slate-200"
          )}
        >
          {inbound ? "+" : "−"}
          {tx.amount} USDC
        </span>
        <span className="flex items-center gap-1 text-xs">
          <span className={STATE_STYLE[tx.state]}>{tx.state}</span>
          {tx.txHash && (
            <a
              href={arcTxUrl(tx.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-300"
              aria-label="View on Arc explorer"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </span>
      </div>
    </div>
  )
}
