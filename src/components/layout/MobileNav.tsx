"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { NAV_ITEMS } from "@/lib/constants"
import { useLanguage } from "@/hooks/useLanguage"
import { cn } from "@/lib/utils"

// Mobile bottom tab bar — the Sidebar is hidden below md and this takes over.
// Fixed to the bottom with safe-area padding for notched devices.
export function MobileNav() {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-900/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors",
                  active
                    ? "text-emerald-400"
                    : "text-slate-500 hover:text-slate-200"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="w-full truncate text-center">
                  {item.i18nKey ? t(item.i18nKey) : item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
