const MAX_SCORE = 1000
const RADIUS = 70
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function band(score: number): { stroke: string; text: string; label: string } {
  if (score >= 650)
    return { stroke: "#34d399", text: "text-emerald-400", label: "Strong" }
  if (score >= 450)
    return { stroke: "#fbbf24", text: "text-amber-400", label: "Building" }
  return { stroke: "#f87171", text: "text-red-400", label: "Limited" }
}

export function CreditScore({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(1, score / MAX_SCORE))
  const offset = CIRCUMFERENCE * (1 - pct)
  const { stroke, text, label } = band(score)

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
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`font-mono text-3xl font-semibold ${text}`}>
          {score}
        </span>
        <span className="text-xs uppercase tracking-wide text-slate-500">
          {label}
        </span>
      </div>
    </div>
  )
}
