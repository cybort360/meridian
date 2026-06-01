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

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: "text-emerald-400",
  PENDING: "text-amber-400",
  FAILED: "text-red-400",
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const inbound = item.direction === "IN"
  const Icon = inbound ? ArrowDownLeft : ArrowUpRight
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
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
          <p className="truncate text-sm font-medium text-slate-200">
            {humanize(item.type)}
          </p>
          <p className="truncate text-xs text-slate-500">
            {inbound ? "from" : "to"} {item.counterparty} ·{" "}
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className="flex items-center font-mono text-sm font-semibold">
          <span className={cn("mr-0.5", inbound ? "text-emerald-400" : "text-red-400")}>
            {inbound ? "+" : "−"}
          </span>
          <USDCAmount
            baseUnits={BigInt(item.amountUSDC)}
            size="sm"
            className={inbound ? "text-emerald-400" : "text-red-400"}
          />
        </span>
        <span
          className={cn("text-xs", STATUS_COLOR[item.status] ?? "text-slate-400")}
        >
          {item.status.toLowerCase()}
        </span>
      </div>
    </div>
  )
}

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  const { lastEvent, connected } = useRealtimeUpdates()
  const [liveItems, setLiveItems] = useState<ActivityItem[]>([])

  // Prepend incoming settlements as they arrive over SSE.
  useEffect(() => {
    if (!lastEvent || lastEvent.type !== "payment_received") return
    const amount = lastEvent.amount != null ? String(lastEvent.amount) : "0"
    const invoiceId =
      typeof lastEvent.invoiceId === "string" ? lastEvent.invoiceId : "x"
    const item: ActivityItem = {
      id: `live-${invoiceId}-${Date.now()}`,
      type: "SETTLEMENT",
      status: "CONFIRMED",
      amountUSDC: amount,
      direction: "IN",
      counterparty: "Settlement",
      createdAt: new Date().toISOString(),
    }
    setLiveItems((prev) => [item, ...prev])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent])

  const isEmpty = liveItems.length === 0 && items.length === 0

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Recent activity
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
            description="USDC transfers will appear here as invoices are funded and settled."
          />
        ) : (
          <div className="divide-y divide-slate-800">
            <AnimatePresence initial={false}>
              {liveItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -16, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <ActivityRow item={item} />
                </motion.div>
              ))}
            </AnimatePresence>
            {items.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
