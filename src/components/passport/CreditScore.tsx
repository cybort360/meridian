"use client"

import { useEffect, useState } from "react"

const MIN_SCORE = 300
const MAX_SCORE = 850
const RADIUS = 70
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function band(score: number): { stroke: string; text: string; label: string } {
  if (score >= 750)
    return { stroke: "#34d399", text: "text-emerald-400", label: "EXCELLENT" }
  if (score >= 650)
    return { stroke: "#60a5fa", text: "text-blue-400", label: "GOOD" }
  if (score >= 500)
    return { stroke: "#fbbf24", text: "text-amber-400", label: "FAIR" }
  return { stroke: "#f87171", text: "text-red-400", label: "POOR" }
}

export function CreditScore({ score }: { score: number }) {
  const { stroke, text, label } = band(score)
  const pct = Math.max(0, Math.min(1, (score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)))
  const target = CIRCUMFERENCE * (1 - pct)

  // Animate on mount: start empty, then transition to the target offset.
  const [offset, setOffset] = useState(CIRCUMFERENCE)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOffset(target))
    return () => cancelAnimationFrame(raf)
  }, [target])

  return (
    <div className="relative flex h-[160px] w-[160px] items-center justify-center">
      <svg width={160} height={160} className="-rotate-90">
        <circle
          cx={80}
          cy={80}
          r={RADIUS}
          fill="none"
          stroke="rgb(30 41 59)"
          strokeWidth={12}
        />
        <circle
          cx={80}
          cy={80}
          r={RADIUS}
          fill="none"
          stroke={stroke}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`font-mono text-3xl font-semibold ${text}`}>
          {score}
        </span>
        <span className={`text-xs font-medium uppercase tracking-wide ${text}`}>
          {label}
        </span>
      </div>
    </div>
  )
}
