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
// a separate gas asset - the faucet funds gas and USDC together.
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

// ─── Circle Gateway (unified USDC balance) ──────────────────
// The Gateway Wallet contract address is the same across all supported EVM
// chains (Arc testnet included). https://developers.circle.com/gateway
export const GATEWAY_WALLET_ADDRESS =
  "0x0077777d7EBA4688BDeF3E311b846F25870A19B9"
// Public, no-auth balances endpoint. POST /v1/balances { token, sources }.
export const GATEWAY_API_URL = "https://gateway-api-testnet.circle.com"
// GatewayMinter receives the attestation and mints USDC on the destination
// chain. Same address across supported EVM testnets (Arc included).
export const GATEWAY_MINTER_ADDRESS =
  "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B"
// CCTP/Gateway domain id for Arc testnet.
export const ARC_GATEWAY_DOMAIN = 26

// ─── Circle USYC (tokenized T-bill yield) ───────────────────
// USYC is only deployed on Ethereum Sepolia on testnet (not Arc), so the
// "real" yield mode runs the investor's subscribe/redeem there. The simulated
// mode models the same flow on Arc without touching these contracts.
// https://developers.circle.com/tokenized/usyc
export const USYC_BLOCKCHAIN = "ETH-SEPOLIA"
export const USYC_TELLER_ADDRESS = "0x96424C885951ceb4B79fecb934eD857999e6f82B"
export const USYC_TOKEN_ADDRESS = "0x38D3A3f8717F4DB1CcB4Ad7D8C755919440848A3"
export const SEPOLIA_USDC_ADDRESS =
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
