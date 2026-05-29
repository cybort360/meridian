"use client"

import { useSession, signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileNav } from "./MobileNav"

export function TopBar() {
  const { data: session } = useSession()

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 md:px-6">
      <MobileNav />
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
