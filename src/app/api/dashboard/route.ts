import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Invoice } from "@prisma/client"

const MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
]
const USDC_MULTIPLIER = 1_000_000
const DAY_MS = 86_400_000

const FUNDED_STATUSES = ["ACTIVE", "REPAID", "SETTLED"]

function toUsd(baseUnits: bigint): number {
  return Number(baseUnits) / USDC_MULTIPLIER
}

// Full invoice value advanced — Card 1 uses the gross invoice amount of every
// invoice that has been funded (capital has flowed against it).
function fundedAmount(invoices: Invoice[]): bigint {
  return invoices
    .filter((i) => FUNDED_STATUSES.includes(i.status))
    .reduce((sum, i) => sum + i.amountUSDC, 0n)
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

// GET /api/dashboard — Finance Hub metrics, secondary pills, a 6-month flow
// series, the invoice pipeline, portfolio risk, and recent activity.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id
    const isInvestor = session.user.role === "INVESTOR"

    const invoices = await prisma.invoice.findMany({
      where: isInvestor ? { investorId: userId } : { smeId: userId },
      orderBy: { createdAt: "desc" },
    })

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS)

    // ── Card 1: Total Financed (gross value of all funded invoices) ──────────
    const totalFinanced = fundedAmount(invoices)
    const fundedThisMonth = invoices
      .filter((i) => i.fundedAt && i.fundedAt >= monthStart)
      .reduce((s, i) => s + toUsd(i.amountUSDC), 0)
    const fundedLastMonth = invoices
      .filter(
        (i) =>
          i.fundedAt && i.fundedAt >= lastMonthStart && i.fundedAt < monthStart
      )
      .reduce((s, i) => s + toUsd(i.amountUSDC), 0)
    const totalFinancedChangePct = pctChange(fundedThisMonth, fundedLastMonth)

    // ── Card 2: Capital Deployed (gross value of ACTIVE invoices) ────────────
    const active = invoices.filter((i) => i.status === "ACTIVE")
    const capitalDeployed = active.reduce((s, i) => s + i.amountUSDC, 0n)

    // ── Card 3: Avg Settlement (fundedAt → settledAt across SETTLED) ─────────
    const settledWithDates = invoices.filter(
      (i) => i.status === "SETTLED" && i.fundedAt && i.settledAt
    )
    const avgSettlementDays =
      settledWithDates.length > 0
        ? Math.round(
            (settledWithDates.reduce(
              (s, i) =>
                s + (i.settledAt!.getTime() - i.fundedAt!.getTime()) / DAY_MS,
              0
            ) /
              settledWithDates.length) *
              10
          ) / 10
        : null

    // ── Card 4: On-Time Rate (settled vs. settled + defaulted) ───────────────
    const settledCount = invoices.filter((i) => i.status === "SETTLED").length
    const defaultedCount = invoices.filter(
      (i) => i.status === "DEFAULTED"
    ).length
    const resolved = settledCount + defaultedCount
    const onTimeRate =
      resolved > 0 ? Math.round((settledCount / resolved) * 100) : null

    // Credit-score points gained over the last 30 days (Card 4 sub-label).
    const since = new Date(now.getTime() - 30 * DAY_MS)
    const recentEvents = await prisma.creditEvent.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { scoreChange: true },
    })
    const onTimePointsThisMonth = recentEvents.reduce(
      (s, e) => s + e.scoreChange,
      0
    )

    // ── Secondary pills: Paid / Due / Overdue ────────────────────────────────
    const paidInvoices = invoices.filter((i) => i.status === "SETTLED")
    const dueInvoices = active.filter((i) => i.dueDate >= now)
    const overdueInvoices = invoices.filter(
      (i) =>
        i.status === "DEFAULTED" || (i.status === "ACTIVE" && i.dueDate < now)
    )
    const paidThisMonth = paidInvoices.filter(
      (i) => i.settledAt && i.settledAt >= monthStart
    ).length
    const paidLastMonth = paidInvoices.filter(
      (i) =>
        i.settledAt && i.settledAt >= lastMonthStart && i.settledAt < monthStart
    ).length
    const overdueThisWeek = overdueInvoices.filter(
      (i) => i.dueDate >= weekAgo && i.dueDate < now
    ).length
    const sumAmount = (list: Invoice[]): string =>
      list.reduce((s, i) => s + i.amountUSDC, 0n).toString()

    // ── 6-month flow: Financed (advance disbursed) vs. Repaid (settled) ──────
    const monthlyFlow: Array<{
      month: string
      financed: number
      repaid: number
    }> = []
    for (let k = 5; k >= 0; k--) {
      const start = new Date(now.getFullYear(), now.getMonth() - k, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - k + 1, 1)
      const financed = invoices
        .filter((i) => i.fundedAt && i.fundedAt >= start && i.fundedAt < end)
        .reduce((s, i) => {
          const advance =
            i.advanceRate !== null
              ? (i.amountUSDC * BigInt(i.advanceRate)) / 100n
              : 0n
          return s + toUsd(advance)
        }, 0)
      const repaid = invoices
        .filter((i) => i.settledAt && i.settledAt >= start && i.settledAt < end)
        .reduce((s, i) => s + toUsd(i.amountUSDC), 0)
      monthlyFlow.push({ month: MONTH_LABELS[start.getMonth()], financed, repaid })
    }

    // ── Invoice pipeline: most recent 5 ──────────────────────────────────────
    const pipeline = invoices.slice(0, 5).map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      buyerName: i.buyerName,
      amountUSDC: i.amountUSDC.toString(),
      status: i.status,
      dueDate: i.dueDate.toISOString(),
    }))

    // ── Portfolio risk across ACTIVE invoices ────────────────────────────────
    const scored = active.filter((i) => i.riskScore !== null)
    const risk = {
      avgScore:
        scored.length > 0
          ? Math.round(
              scored.reduce((s, i) => s + (i.riskScore ?? 0), 0) / scored.length
            )
          : null,
      low: active.filter((i) => i.riskLabel === "LOW").length,
      medium: active.filter((i) => i.riskLabel === "MEDIUM").length,
      high: active.filter((i) => i.riskLabel === "HIGH").length,
    }

    // ── Recent activity: payments touching this user's wallet ────────────────
    const wallet = await prisma.wallet.findUnique({ where: { userId } })
    let recentActivity: Array<{
      id: string
      type: string
      status: string
      amountUSDC: string
      direction: "IN" | "OUT"
      counterparty: string
      createdAt: string
    }> = []

    if (wallet) {
      const payments = await prisma.payment.findMany({
        where: {
          OR: [{ senderWalletId: wallet.id }, { receiverWalletId: wallet.id }],
        },
        include: {
          senderWallet: { include: { user: true } },
          receiverWallet: { include: { user: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      })

      recentActivity = payments.map((p) => {
        const outbound = p.senderWalletId === wallet.id
        const counterpartyUser = outbound
          ? p.receiverWallet.user
          : p.senderWallet.user
        return {
          id: p.id,
          type: p.type,
          status: p.status,
          amountUSDC: p.amountUSDC.toString(),
          direction: outbound ? "OUT" : "IN",
          counterparty:
            counterpartyUser?.companyName ??
            counterpartyUser?.name ??
            "Escrow",
          createdAt: p.createdAt.toISOString(),
        }
      })
    }

    return NextResponse.json({
      data: {
        stats: {
          totalFinanced: totalFinanced.toString(),
          totalFinancedChangePct,
          capitalDeployed: capitalDeployed.toString(),
          activeInvoices: active.length,
          avgSettlementDays,
          onTimeRate,
          onTimePointsThisMonth,
        },
        secondary: {
          paid: {
            count: paidInvoices.length,
            amount: sumAmount(paidInvoices),
            changePct: pctChange(paidThisMonth, paidLastMonth),
          },
          due: { count: dueInvoices.length, amount: sumAmount(dueInvoices) },
          overdue: {
            count: overdueInvoices.length,
            amount: sumAmount(overdueInvoices),
            thisWeek: overdueThisWeek,
          },
        },
        monthlyFlow,
        pipeline,
        risk,
        recentActivity,
      },
    })
  } catch (error) {
    console.error("[API /dashboard GET]", error)
    return NextResponse.json(
      { error: "Could not load the dashboard. Please try again." },
      { status: 500 }
    )
  }
}
