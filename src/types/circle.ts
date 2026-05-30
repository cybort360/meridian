export type CircleTransactionState =
  | "INITIATED"
  | "QUEUED"
  | "SENT"
  | "CONFIRMED"
  | "COMPLETE"
  | "FAILED"
  | "CANCELLED"
  | "DENIED"

// Normalized transaction shape for the UI / API responses.
export interface WalletTransaction {
  id: string
  direction: "INBOUND" | "OUTBOUND"
  amount: string // decimal string, e.g. "100.50"
  state: CircleTransactionState
  txHash?: string
  counterpartyAddress?: string
  createDate: string
}

export interface TransferParams {
  fromCircleWalletId: string
  toAddress: string
  amountBaseUnits: bigint
}

export interface TransferResult {
  circlePaymentId: string
  state: CircleTransactionState
  txHash?: string
}
