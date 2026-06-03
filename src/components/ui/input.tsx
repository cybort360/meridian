import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-elevated px-3.5 py-2.5 text-sm text-ink-50 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink-50 placeholder:text-ink-600 focus-visible:border-[rgba(200,169,110,0.5)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(200,169,110,0.08)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
