"use client"

import { useSession, signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/constants"
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates"
import { LanguageToggle } from "@/components/shared/LanguageToggle"
import { cn } from "@/lib/utils"

function LiveIndicator() {
  const { connected } = useRealtimeUpdates()
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium",
        connected
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
          : "border-slate-700 bg-slate-800 text-slate-500"
      )}
      title={connected ? "Real-time updates connected" : "Real-time updates offline"}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          connected ? "animate-pulse bg-emerald-400" : "bg-slate-500"
        )}
      />
      {connected ? "Live" : "Offline"}
    </span>
  )
}

export function TopBar() {
  const { data: session } = useSession()

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold">
          <span className="font-sora text-sm font-bold text-[#0C0D13]">M</span>
        </span>
        <span className="font-sora font-bold text-slate-100">{APP_NAME}</span>
      </div>
      <div className="ms-auto flex items-center gap-3">
        <LanguageToggle />
        <LiveIndicator />
        {session?.user && (
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-100">
              {session.user.name}
            </p>
            <p className="text-xs capitalize text-slate-500">
              {session.user.role.toLowerCase()}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-slate-400 hover:text-slate-100"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
