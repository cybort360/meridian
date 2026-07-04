import type { Invoice, User } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { fromUSDCBaseUnits } from "@/lib/utils/usdc"
import { scoreInvoiceRisk, type RiskScoringInput } from "@/lib/ai/riskScoring"
import type { InvoiceDTO } from "@/types/invoiceDto"
import type { InvoiceStatus, RiskLabel } from "@/types"

type SmeRelation = Pick<User, "id" | "name" | "companyName" | "kycStatus">
type InvestorRelation = Pick<User, "id" | "name">

export type InvoiceWithRelations = Invoice & {
  sme?: SmeRelation | null
  investor?: InvestorRelation | null
}

export function serializeInvoice(inv: InvoiceWithRelations): InvoiceDTO {
  return {
    id: inv.id,
    title: inv.title,
    description: inv.description,
    buyerName: inv.buyerName,
    buyerEmail: inv.buyerEmail,
    amountUSDC: inv.amountUSDC.toString(),
    dueDate: inv.dueDate.toISOString(),
    invoiceNumber: inv.invoiceNumber,
    status: inv.status as InvoiceStatus,
    riskScore: inv.riskScore,
    riskLabel: (inv.riskLabel as RiskLabel | null) ?? null,
    riskSummary: inv.riskSummary,
    advanceRate: inv.advanceRate,
    feeRate: inv.feeRate,
    buyerSignedAt: inv.buyerSignedAt ? inv.buyerSignedAt.toISOString() : null,
    createdAt: inv.createdAt.toISOString(),
    sme: inv.sme
      ? {
          id: inv.sme.id,
          name: inv.sme.name,
          companyName: inv.sme.companyName,
          kycStatus: inv.sme.kycStatus,
        }
      : undefined,
    investor: inv.investor
      ? { id: inv.investor.id, name: inv.investor.name }
      : null,
  }
}

// Derive the SME's repayment track record for the risk model.
export async function computeSmeHistory(
  smeId: string
): Promise<RiskScoringInput["smeTransactionHistory"]> {
  const invoices = await prisma.invoice.findMany({ where: { smeId } })

  const settled = invoices.filter((i) => i.status === "SETTLED")
  const defaulted = invoices.filter((i) => i.status === "DEFAULTED").length

  let avgDaysToSettle = 0
  if (settled.length > 0) {
    const totalDays = settled.reduce((sum, i) => {
      const end = i.settledAt ?? i.updatedAt
      const days = Math.max(
        0,
        Math.round((end.getTime() - i.createdAt.getTime()) / 86_400_000)
      )
      return sum + days
    }, 0)
    avgDaysToSettle = Math.round(totalDays / settled.length)
  }

  return {
    totalInvoices: invoices.length,
    settledOnTime: settled.length,
    defaulted,
    avgDaysToSettle,
  }
}

// Run AI scoring for an invoice and persist the result, moving it to SCORED.
// Never throws on AI failure - scoreInvoiceRisk returns a neutral fallback.
export async function scoreAndPersist(
  invoiceId: string
): Promise<InvoiceWithRelations> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { sme: true },
  })
  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`)
  }

  const history = await computeSmeHistory(invoice.smeId)

  const assessment = await scoreInvoiceRisk({
    invoiceAmount: Number(fromUSDCBaseUnits(invoice.amountUSDC)),
    dueDate: invoice.dueDate,
    buyerName: invoice.buyerName,
    buyerEmail: invoice.buyerEmail,
    smeCompanyName: invoice.sme.companyName ?? invoice.sme.name,
    smeTransactionHistory: history,
    description: invoice.description ?? "",
  })

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      riskScore: assessment.riskScore,
      riskLabel: assessment.riskLabel,
      riskSummary: assessment.summary,
      advanceRate: assessment.advanceRate,
      // Status is NOT advanced here - an invoice only becomes SCORED (listable)
      // once the buyer countersigns via the verification link.
    },
    include: { sme: true, investor: true },
  })
}
