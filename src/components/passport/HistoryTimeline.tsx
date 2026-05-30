import { format } from "date-fns"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CreditEventDTO } from "@/hooks/usePassport"

function humanizeType(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function HistoryTimeline({ events }: { events: CreditEventDTO[] }) {
  return (
    <ol className="relative space-y-4 border-l border-slate-800 pl-6">
      {events.map((event) => {
        const positive = event.scoreChange >= 0
        const Icon = positive ? TrendingUp : TrendingDown
        return (
          <li key={event.id} className="relative">
            <span
              className={cn(
                "absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-slate-950",
                positive
                  ? "bg-emerald-400/20 text-emerald-400"
                  : "bg-red-400/20 text-red-400"
              )}
            >
              <Icon className="h-3 w-3" />
            </span>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {humanizeType(event.type)}
                </p>
                <p className="text-xs text-slate-500">
                  {format(new Date(event.createdAt), "MMM d, yyyy · h:mm a")}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "font-mono text-sm font-semibold",
                    positive ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {positive ? "+" : ""}
                  {event.scoreChange}
                </p>
                <p className="text-xs text-slate-500">→ {event.newScore}</p>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
