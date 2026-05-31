import type { InvoiceStatus, RiskLabel } from "./invoice"

// Invoice as serialized over the API (BigInt amounts become strings, dates ISO).
export interface InvoiceDTO {
  id: string
  title: string
  description: string | null
  buyerName: string
  buyerEmail: string
  amountUSDC: string // base units, as string
  dueDate: string // ISO
  invoiceNumber: string
  status: InvoiceStatus
  riskScore: number | null
  riskLabel: RiskLabel | null
  riskSummary: string | null
  advanceRate: number | null
  feeRate: number
  buyerSignedAt: string | null
  createdAt: string // ISO
  sme?: { id: string; name: string; companyName: string | null }
  investor?: { id: string; name: string } | null
}
