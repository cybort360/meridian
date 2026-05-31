"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const HUB = { x: 252, y: 132 }

// Purely visual / marketing — fixed destinations radiating from the UAE hub.
const CORRIDORS = [
  { x: 206, y: 66, label: "UK", anchor: "end" as const },
  { x: 92, y: 96, label: "USA", anchor: "end" as const },
  { x: 292, y: 110, label: "Pakistan", anchor: "start" as const },
  { x: 312, y: 146, label: "India", anchor: "start" as const },
  { x: 346, y: 182, label: "Singapore", anchor: "start" as const },
]

export function CorridorMap() {
  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <CardTitle className="text-base">Active Payment Corridors</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox="0 0 480 240" className="h-56 w-full">
          {/* Faint globe graticule — suggests a world map without the weight */}
          <g stroke="#1e293b" fill="none" strokeWidth={1}>
            <circle cx="240" cy="120" r="104" />
            <ellipse cx="240" cy="120" rx="104" ry="40" />
            <ellipse cx="240" cy="120" rx="104" ry="72" />
            <ellipse cx="240" cy="120" rx="40" ry="104" />
            <ellipse cx="240" cy="120" rx="72" ry="104" />
            <line x1="136" y1="120" x2="344" y2="120" />
            <line x1="240" y1="16" x2="240" y2="224" />
          </g>

          {CORRIDORS.map((c, i) => {
            const midX = (HUB.x + c.x) / 2
            const path = `M ${HUB.x} ${HUB.y} Q ${midX} ${HUB.y - 48} ${c.x} ${c.y}`
            return (
              <g key={c.label}>
                <motion.path
                  d={path}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                  strokeDasharray="5 5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, strokeDashoffset: [0, -20] }}
                  transition={{
                    opacity: { duration: 0.6, delay: 0.2 + i * 0.12 },
                    strokeDashoffset: {
                      repeat: Infinity,
                      duration: 0.9,
                      ease: "linear",
                    },
                  }}
                />
                {/* Pulsing destination dot */}
                <circle cx={c.x} cy={c.y} r={3.5} fill="#34d399" />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={3.5}
                  fill="#34d399"
                  className="animate-ping"
                  style={{ transformOrigin: `${c.x}px ${c.y}px` }}
                />
                <text
                  x={c.anchor === "end" ? c.x - 8 : c.x + 8}
                  y={c.y + 3}
                  textAnchor={c.anchor}
                  fill="#94a3b8"
                  fontSize={10}
                >
                  {c.label}
                </text>
              </g>
            )
          })}

          {/* UAE hub */}
          <circle cx={HUB.x} cy={HUB.y} r={6} fill="#34d399" />
          <circle
            cx={HUB.x}
            cy={HUB.y}
            r={11}
            fill="none"
            stroke="#34d399"
            strokeOpacity={0.4}
          />
          <text
            x={HUB.x}
            y={HUB.y + 26}
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize={12}
            fontWeight={600}
          >
            UAE
          </text>
        </svg>
      </CardContent>
    </Card>
  )
}
