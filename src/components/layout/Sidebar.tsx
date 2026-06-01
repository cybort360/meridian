"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Compass } from "lucide-react"
import { NAV_ITEMS, APP_NAME } from "@/lib/constants"
import { useLanguage } from "@/hooks/useLanguage"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-e border-slate-800 bg-slate-900 md:flex">
      <Link
        href="/dashboard"
        className="flex h-16 items-center gap-2 border-b border-slate-800 px-6"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 ring-1 ring-emerald-400/20">
          <Compass className="h-5 w-5 text-emerald-400" />
        </span>
        <span className="text-lg font-semibold tracking-tight text-slate-100">
          {APP_NAME}
        </span>
      </Link>

      <nav className="flex-1 space-y-1 p-4">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.i18nKey ? t(item.i18nKey) : item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
