"use client"

import { useSession, signOut } from "next-auth/react"
import { LogOut, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/constants"

export function TopBar() {
  const { data: session } = useSession()

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 ring-1 ring-emerald-400/20">
          <Compass className="h-5 w-5 text-emerald-400" />
        </span>
        <span className="font-semibold text-slate-100">{APP_NAME}</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
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
