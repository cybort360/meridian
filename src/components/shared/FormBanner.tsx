"use client"

import { motion } from "framer-motion"
import { CheckCircle2, XCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  type: "success" | "error"
  message: string
  onDismiss?: () => void
}

// Full-width form feedback banner. Slides down (height 0 → auto) on mount.
export function FormBanner({ type, message, onDismiss }: Props) {
  const isSuccess = type === "success"
  const Icon = isSuccess ? CheckCircle2 : XCircle

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div
        className={cn(
          "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
          isSuccess
            ? "border-emerald-500/40 bg-emerald-950 text-emerald-300"
            : "border-red-500/40 bg-red-950 text-red-300"
        )}
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <span className="flex-1">{message}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}
