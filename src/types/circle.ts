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
  // Deterministic key so a retry/double-submit reuses the same Circle transfer
  // instead of creating a second one. Falls back to a random UUID if omitted.
  idempotencyKey?: string
}

export interface TransferResult {
  circlePaymentId: string
  state: CircleTransactionState
  txHash?: string
}
