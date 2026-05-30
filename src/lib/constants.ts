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

// ─── Circle / Arc ───────────────────────────────────────────
// Arc uses USDC as its native gas token, so EOA wallets work without
// a separate gas asset — the faucet funds gas and USDC together.
export const CIRCLE_BLOCKCHAIN = "ARC-TESTNET"
export const CIRCLE_ACCOUNT_TYPE = "EOA"

// USDC on Arc testnet (6 decimals). https://docs.arc.network
export const ARC_USDC_TOKEN_ADDRESS =
  "0x3600000000000000000000000000000000000000"
export const USDC_SYMBOL = "USDC"

export const ARC_EXPLORER_URL = "https://testnet.arcscan.app"
export const ARC_FAUCET_URL = "https://faucet.circle.com"
export const ARC_CHAIN_ID = 5042002

export function arcTxUrl(txHash: string): string {
  return `${ARC_EXPLORER_URL}/tx/${txHash}`
}
