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
  // Dot-notation i18n key (see src/messages). Omitted items fall back to label.
  i18nKey?: string
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, i18nKey: "nav.dashboard" },
  { label: "Invoices", href: "/invoices", icon: FileText, i18nKey: "nav.invoices" },
  { label: "Marketplace", href: "/marketplace", icon: Store, i18nKey: "nav.marketplace" },
  { label: "Wallet", href: "/wallet", icon: Wallet, i18nKey: "nav.wallet" },
  { label: "Passport", href: "/passport", icon: IdCard, i18nKey: "nav.passport" },
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
