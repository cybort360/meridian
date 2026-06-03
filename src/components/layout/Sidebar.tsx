"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { NAV_ITEMS, APP_NAME } from "@/lib/constants"
import { useLanguage } from "@/hooks/useLanguage"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-e border-[rgba(255,255,255,0.05)] bg-[#080910] md:flex print:hidden">
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 px-4 pb-6 pt-5"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold">
          <span className="font-sora text-sm font-bold text-[#0C0D13]">M</span>
        </span>
        <span className="font-sora text-[17px] font-bold tracking-[-0.02em] text-ink-50">
          {APP_NAME}
        </span>
      </Link>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 font-inter text-sm font-medium transition-colors",
                active
                  ? "bg-elevated text-ink-50"
                  : "text-ink-200 hover:bg-elevated/50 hover:text-ink-50"
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
