"use client"

import { format } from "date-fns"
import { ArrowDownLeft, ArrowUpRight, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { USDCAmount } from "@/components/shared/USDCAmount"
import { EmptyState } from "@/components/shared/EmptyState"
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

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="USDC transfers will appear here as invoices are funded and settled."
          />
        ) : (
          <div className="divide-y divide-slate-800">
            {items.map((item) => {
              const inbound = item.direction === "IN"
              const Icon = inbound ? ArrowDownLeft : ArrowUpRight
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
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
                        {format(new Date(item.createdAt), "MMM d")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <USDCAmount baseUnits={BigInt(item.amountUSDC)} size="sm" />
                    <span
                      className={cn(
                        "text-xs",
                        STATUS_COLOR[item.status] ?? "text-slate-400"
                      )}
                    >
                      {item.status.toLowerCase()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
