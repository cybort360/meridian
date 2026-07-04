export type InvoiceStatus =
  | "PENDING"
  | "SCORED"
  | "FUNDED"
  | "ACTIVE"
  | "REPAID"
  | "SETTLED"
  | "DEFAULTED"
  | "CANCELLED"

export type RiskLabel = "LOW" | "MEDIUM" | "HIGH"

export interface Invoice {
  id: string
  title: string
  description?: string
  buyerName: string
  buyerEmail: string
  amountUSDC: bigint // Always bigint - never number for amounts
  dueDate: string // ISO string
  invoiceNumber: string
  status: InvoiceStatus
  riskScore?: number
  riskLabel?: RiskLabel
  riskSummary?: string
  advanceRate?: number
  fundedAt?: string
  settledAt?: string
  sme: { id: string; name: string; companyName?: string }
  investor?: { id: string; name: string }
  createdAt: string
}

export interface CreateInvoiceInput {
  title: string
  description?: string
  buyerName: string
  buyerEmail: string
  amountUSDC: number // Input as number (human-readable), converted to bigint before save
  dueDate: string
  invoiceNumber: string
}
