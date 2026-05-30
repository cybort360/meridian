"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

// Route-segment error boundary for all dashboard pages — prevents a thrown
// render error from blanking the whole app.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[dashboard error]", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-400/10 text-red-400">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h2 className="text-lg font-semibold text-slate-100">
        Something went wrong
      </h2>
      <p className="mt-1 max-w-sm text-sm text-slate-400">
        An unexpected error occurred while loading this page. You can try again.
      </p>
      <Button
        onClick={reset}
        className="mt-4 bg-emerald-500 text-slate-950 hover:bg-emerald-400"
      >
        Try again
      </Button>
    </div>
  )
}
