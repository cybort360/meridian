import {
  LayoutDashboard,
  FileText,
  Store,
  Wallet,
  IdCard,
  Settings,
  type LucideIcon,
} from "lucide-react"

export const APP_NAME = "Meridian"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Marketplace", href: "/marketplace", icon: Store },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Passport", href: "/passport", icon: IdCard },
  { label: "Settings", href: "/settings", icon: Settings },
]
