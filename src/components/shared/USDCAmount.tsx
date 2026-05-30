import { formatUSDC, fromUSDCBaseUnits } from "@/lib/utils/usdc"
import { cn } from "@/lib/utils"

interface Props {
  baseUnits: bigint
  size?: "sm" | "md" | "lg" | "xl"
  showSymbol?: boolean
  className?: string
}

const SIZE_CLASS: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl",
}

export function USDCAmount({
  baseUnits,
  size = "md",
  showSymbol = true,
  className,
}: Props) {
  const formatted = formatUSDC(fromUSDCBaseUnits(baseUnits))
  return (
    <span
      className={cn(
        "font-mono font-semibold text-emerald-400",
        SIZE_CLASS[size],
        className
      )}
    >
      {showSymbol && <span className="mr-1 text-sm text-slate-500">USDC</span>}
      {formatted}
    </span>
  )
}
