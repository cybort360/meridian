"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { CheckCircle2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatUSDC } from "@/lib/utils/usdc"
import { cn } from "@/lib/utils"
import type { MonthlyFlowPoint } from "@/hooks/useDashboard"

function abbrev(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return `${v}`
}

export function FlowChart({
  flow,
  onTimeRate,
}: {
  flow: MonthlyFlowPoint[]
  onTimeRate: number | null
}) {
  const healthy = onTimeRate === null || onTimeRate >= 80

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">USDC Flow</CardTitle>
        <p className="text-sm text-slate-400">
          6-month projection based on transaction history
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={flow}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="financedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="repaidFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#475569"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#475569"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={abbrev}
              />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: 8,
                  color: "#e2e8f0",
                  fontSize: 12,
                }}
                formatter={(value, name) => [
                  `USDC ${formatUSDC(Number(value))}`,
                  name,
                ]}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
              />
              <Area
                type="monotone"
                dataKey="financed"
                name="Financed"
                stroke="#34d399"
                strokeWidth={2}
                fill="url(#financedFill)"
              />
              <Area
                type="monotone"
                dataKey="repaid"
                name="Repaid"
                stroke="#818cf8"
                strokeWidth={2}
                fill="url(#repaidFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div
          className={cn(
            "mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
            healthy
              ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
              : "border-amber-400/20 bg-amber-400/5 text-amber-300"
          )}
        >
          {healthy ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>
            {healthy ? (
              <>
                <span className="font-medium">Healthy Portfolio</span> -
                repayment rate above benchmark
              </>
            ) : (
              <>
                <span className="font-medium">Review required</span> - repayment
                rate below benchmark
              </>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
