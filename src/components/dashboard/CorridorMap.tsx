"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const HUB = { x: 64, y: 110 }
const CORRIDORS = [
  { x: 430, y: 36, label: "United Kingdom" },
  { x: 448, y: 92, label: "United States" },
  { x: 438, y: 150, label: "India" },
  { x: 418, y: 200, label: "Singapore" },
]

export function CorridorMap() {
  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <CardTitle className="text-base">Cross-border corridors</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox="0 0 480 230" className="h-56 w-full">
          {CORRIDORS.map((c, i) => {
            const midX = (HUB.x + c.x) / 2
            const path = `M ${HUB.x} ${HUB.y} Q ${midX} ${HUB.y - 40} ${c.x} ${c.y}`
            return (
              <g key={c.label}>
                <motion.path
                  d={path}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.1, delay: 0.2 + i * 0.15 }}
                />
                <circle cx={c.x} cy={c.y} r={4} fill="#34d399" />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={4}
                  fill="#34d399"
                  className="animate-ping"
                  style={{ transformOrigin: `${c.x}px ${c.y}px` }}
                />
                <text
                  x={c.x - 10}
                  y={c.y + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize={11}
                >
                  {c.label}
                </text>
              </g>
            )
          })}

          <circle cx={HUB.x} cy={HUB.y} r={7} fill="#34d399" />
          <circle
            cx={HUB.x}
            cy={HUB.y}
            r={12}
            fill="none"
            stroke="#34d399"
            strokeOpacity={0.4}
          />
          <text
            x={HUB.x}
            y={HUB.y + 28}
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
