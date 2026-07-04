import { prisma } from "@/lib/prisma"

// FICO-like scale: start at 500, apply each CreditEvent delta, clamp 300-850.
export const BASE_SCORE = 500
export const MIN_SCORE = 300
export const MAX_SCORE = 850

export type CreditLabel = "POOR" | "FAIR" | "GOOD" | "EXCELLENT"

export interface CreditScoreResult {
  score: number
  label: CreditLabel
  totalEvents: number
  invoicesSettled: number
  invoicesDefaulted: number
  totalVolumeUSDC: string // advanced volume, base units as string
}

export function labelForScore(score: number): CreditLabel {
  if (score >= 750) return "EXCELLENT"
  if (score >= 650) return "GOOD"
  if (score >= 500) return "FAIR"
  return "POOR"
}

export async function computeCreditScore(
  userId: string
): Promise<CreditScoreResult> {
  const events = await prisma.creditEvent.findMany({ where: { userId } })
  const raw = events.reduce((sum, e) => sum + e.scoreChange, BASE_SCORE)
  const score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, raw))

  const invoices = await prisma.invoice.findMany({ where: { smeId: userId } })
  const invoicesSettled = invoices.filter((i) => i.status === "SETTLED").length
  const invoicesDefaulted = invoices.filter(
    (i) => i.status === "DEFAULTED"
  ).length

  const totalVolumeUSDC = invoices
    .filter((i) => ["ACTIVE", "REPAID", "SETTLED"].includes(i.status))
    .reduce((sum, i) => {
      const advance =
        i.advanceRate !== null
          ? (i.amountUSDC * BigInt(i.advanceRate)) / 100n
          : 0n
      return sum + advance
    }, 0n)

  return {
    score,
    label: labelForScore(score),
    totalEvents: events.length,
    invoicesSettled,
    invoicesDefaulted,
    totalVolumeUSDC: totalVolumeUSDC.toString(),
  }
}
