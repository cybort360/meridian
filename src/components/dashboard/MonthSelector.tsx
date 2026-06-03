"use client"

import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { Calendar, ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

function lastMonths(n: number): { value: string; label: string }[] {
  const now = new Date()
  const out: { value: string; label: string }[] = []
  for (let k = 0; k < n; k++) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1)
    out.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") })
  }
  return out
}

export function MonthSelector({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const months = lastMonths(12)
  const current = months.find((m) => m.value === value) ?? months[0]

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-800"
      >
        <Calendar className="h-4 w-4 text-slate-500" />
        <span>{current.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-1 max-h-72 w-44 overflow-y-auto rounded-lg border border-slate-700 bg-elevated p-1 shadow-lg"
        >
          {months.map((m) => (
            <button
              key={m.value}
              type="button"
              role="option"
              aria-selected={m.value === value}
              onClick={() => {
                onChange(m.value)
                setOpen(false)
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-slate-800",
                m.value === value ? "text-gold" : "text-slate-300"
              )}
            >
              {m.label}
              {m.value === value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
