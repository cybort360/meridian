"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowDownLeft, ArrowUpRight, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { EmptyState } from "@/components/shared/EmptyState"
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates"
import { cn } from "@/lib/utils"
import type { ActivityItem } from "@/hooks/useDashboard"

function humanize(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase()
}

function Row({ item }: { item: ActivityItem }) {
  const inbound = item.direction === "IN"
  const Icon = inbound ? ArrowDownLeft : ArrowUpRight
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            inbound
              ? "bg-emerald-400/10 text-emerald-400"
              : "bg-slate-800 text-slate-300"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-200">
            {humanize(item.type)}
          </p>
          <p className="truncate text-xs text-slate-500">
            {inbound ? "from" : "to"} {item.counterparty} ·{" "}
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
      <span className="flex items-center font-mono text-sm font-semibold">
        <span className={cn("mr-0.5", inbound ? "text-emerald-400" : "text-slate-400")}>
          {inbound ? "+" : "−"}
        </span>
        <USDCAmount
          baseUnits={BigInt(item.amountUSDC)}
          size="sm"
          showSymbol={false}
          className={inbound ? "text-emerald-400" : "text-slate-300"}
        />
      </span>
    </div>
  )
}

function Section({ title, items }: { title: string; items: ActivityItem[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <div className="divide-y divide-slate-800/60">
        {items.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

export function ActivityPanel({ items }: { items: ActivityItem[] }) {
  const { lastEvent, connected } = useRealtimeUpdates()
  const [liveItems, setLiveItems] = useState<ActivityItem[]>([])

  // Prepend incoming settlements as they arrive over SSE.
  useEffect(() => {
    if (!lastEvent || lastEvent.type !== "payment_received") return
    const amount = lastEvent.amount != null ? String(lastEvent.amount) : "0"
    const invoiceId =
      typeof lastEvent.invoiceId === "string" ? lastEvent.invoiceId : "x"
    setLiveItems((prev) => [
      {
        id: `live-${invoiceId}-${Date.now()}`,
        type: "SETTLEMENT",
        status: "CONFIRMED",
        amountUSDC: amount,
        direction: "IN",
        counterparty: "Settlement",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent])

  const combined = [...liveItems, ...items].slice(0, 30)
  const incoming = combined.filter((i) => i.direction === "IN")
  const outgoing = combined.filter((i) => i.direction === "OUT")
  const isEmpty = combined.length === 0

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          Activity
          {connected && (
            <span className="relative flex h-2 w-2" title="Live updates connected">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="USDC transfers appear here as invoices are funded and settled."
          />
        ) : (
          // Cap the height and scroll internally so a long feed doesn't keep
          // stretching the dashboard page.
          <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {liveItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </AnimatePresence>
            <Section title="Incoming" items={incoming} />
            {incoming.length > 0 && outgoing.length > 0 && (
              <div className="border-t border-slate-800" />
            )}
            <Section title="Outgoing" items={outgoing} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
