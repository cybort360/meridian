export interface WalletBalance {
  circleWalletId: string
  address: string
  usdcBalance: string // Formatted for display: "1,234.56"
  usdcBalanceRaw: bigint // In base units for calculations
  blockchain: string
}

// Serialized wallet returned by our API (usdcBalanceRaw as string over the wire).
export interface WalletDTO {
  circleWalletId: string
  address: string
  blockchain: string
}
