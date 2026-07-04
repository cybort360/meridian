import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-inter text-sm font-medium tracking-[0.01em] transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(200,169,110,0.25)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary - gold
        default: "bg-gold text-[#0C0D13] hover:bg-gold-bright",
        // Danger
        destructive:
          "border border-red-900 bg-transparent text-red-400 hover:bg-red-950/30",
        // Secondary - outline
        outline:
          "border border-[rgba(255,255,255,0.12)] bg-transparent text-ink-50 hover:bg-elevated",
        // Tertiary - filled elevated
        secondary: "bg-elevated text-ink-50 hover:bg-[#1A1B24]",
        // Ghost
        ghost: "bg-elevated text-ink-200 hover:bg-[#1A1B24] hover:text-ink-50",
        link: "text-gold underline-offset-4 hover:underline",
      },
      size: {
        default: "px-5 py-2.5",
        sm: "px-4 py-2",
        lg: "px-6 py-3",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
