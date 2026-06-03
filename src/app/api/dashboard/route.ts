import { NextRequest, NextResponse } from "next/server"
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

function toUsd(baseUnits: bigint): number {
  return Number(baseUnits) / USDC_MULTIPLIER
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

// Resolves the "as of" reference time + the selected month window from a
// ?month=YYYY-MM param. Everything on the dashboard is computed relative to
// `ref` so picking a past month shows the dashboard as it stood then (using
// invoice timestamps rather than current status).
function resolveWindow(monthParam: string | null): {
  ref: Date
  monthStart: Date
  lastMonthStart: Date
} {
  const now = new Date()
  const m = monthParam?.match(/^(\d{4})-(\d{2})$/)
  if (m) {
    const year = Number(m[1])
    const month = Number(m[2]) - 1
    const monthStart = new Date(year, month, 1)
    const nextMonth = new Date(year, month + 1, 1)
    // End of the selected month, capped at "now" for the current/future month.
    const ref = nextMonth <= now ? new Date(nextMonth.getTime() - 1) : now
    const lastMonthStart = new Date(year, month - 1, 1)
    return { ref, monthStart, lastMonthStart }
  }
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { ref: now, monthStart, lastMonthStart }
}

// GET /api/dashboard?month=YYYY-MM — Finance Hub metrics as of the selected
// month (defaults to the current month).
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id
    const isInvestor = session.user.role === "INVESTOR"

    const { searchParams } = new URL(req.url)
    const { ref, monthStart, lastMonthStart } = resolveWindow(
      searchParams.get("month")
    )
    const weekAgo = new Date(ref.getTime() - 7 * DAY_MS)

    const invoices = await prisma.invoice.findMany({
      where: isInvestor ? { investorId: userId } : { smeId: userId },
      orderBy: { createdAt: "desc" },
    })

    // ── Timestamp predicates (history-aware, relative to `ref`) ──────────────
    const fundedBy = (i: Invoice) =>
      i.fundedAt !== null && i.fundedAt <= ref && i.status !== "CANCELLED"
    const settledBy = (i: Invoice) => i.settledAt !== null && i.settledAt <= ref
    const deployed = (i: Invoice) => fundedBy(i) && !settledBy(i)
    const defaultedBy = (i: Invoice) =>
      i.status === "DEFAULTED" && i.dueDate <= ref

    const sumAmount = (list: Invoice[]): string =>
      list.reduce((s, i) => s + i.amountUSDC, 0n).toString()

    // ── Card 1: Total Financed (gross value funded as of ref) ────────────────
    const fundedInvoices = invoices.filter(fundedBy)
    const totalFinanced = fundedInvoices.reduce((s, i) => s + i.amountUSDC, 0n)
    const fundedThisMonth = invoices
      .filter((i) => i.fundedAt && i.fundedAt >= monthStart && i.fundedAt <= ref)
      .reduce((s, i) => s + toUsd(i.amountUSDC), 0)
    const fundedLastMonth = invoices
      .filter(
        (i) =>
          i.fundedAt && i.fundedAt >= lastMonthStart && i.fundedAt < monthStart
      )
      .reduce((s, i) => s + toUsd(i.amountUSDC), 0)
    const totalFinancedChangePct = pctChange(fundedThisMonth, fundedLastMonth)

    // ── Card 2: Capital Deployed (funded, not yet settled as of ref) ─────────
    const deployedInvoices = invoices.filter(deployed)
    const capitalDeployed = deployedInvoices.reduce(
      (s, i) => s + i.amountUSDC,
      0n
    )

    // ── Card 3: Avg Settlement (settled by ref) ──────────────────────────────
    const settledInvoices = invoices.filter(
      (i) => settledBy(i) && i.fundedAt
    )
    const avgSettlementDays =
      settledInvoices.length > 0
        ? Math.round(
            (settledInvoices.reduce(
              (s, i) =>
                s + (i.settledAt!.getTime() - i.fundedAt!.getTime()) / DAY_MS,
              0
            ) /
              settledInvoices.length) *
              10
          ) / 10
        : null

    // ── Card 4: On-Time Rate (settled vs. settled + defaulted, by ref) ───────
    const settledCount = settledInvoices.length
    const defaultedCount = invoices.filter(defaultedBy).length
    const resolved = settledCount + defaultedCount
    const onTimeRate =
      resolved > 0 ? Math.round((settledCount / resolved) * 100) : null

    const recentEvents = await prisma.creditEvent.findMany({
      where: { userId, createdAt: { gte: monthStart, lte: ref } },
      select: { scoreChange: true },
    })
    const onTimePointsThisMonth = recentEvents.reduce(
      (s, e) => s + e.scoreChange,
      0
    )

    // ── Secondary pills: Paid / Due / Overdue (as of ref) ────────────────────
    const paidInvoices = settledInvoices
    const dueInvoices = deployedInvoices.filter((i) => i.dueDate >= ref)
    const overdueInvoices = invoices.filter(
      (i) => (deployed(i) && i.dueDate < ref) || defaultedBy(i)
    )
    const paidThisMonth = invoices.filter(
      (i) => i.settledAt && i.settledAt >= monthStart && i.settledAt <= ref
    ).length
    const paidLastMonth = invoices.filter(
      (i) =>
        i.settledAt && i.settledAt >= lastMonthStart && i.settledAt < monthStart
    ).length
    const overdueThisWeek = overdueInvoices.filter(
      (i) => i.dueDate >= weekAgo && i.dueDate < ref
    ).length

    // ── 6-month flow ending at the selected month ────────────────────────────
    const monthlyFlow: Array<{
      month: string
      financed: number
      repaid: number
    }> = []
    for (let k = 5; k >= 0; k--) {
      const start = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() - k,
        1
      )
      const end = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() - k + 1,
        1
      )
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
      monthlyFlow.push({
        month: MONTH_LABELS[start.getMonth()],
        financed,
        repaid,
      })
    }

    // ── Invoice pipeline: most recent 5 created by ref ───────────────────────
    const pipeline = invoices
      .filter((i) => i.createdAt <= ref)
      .slice(0, 5)
      .map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        buyerName: i.buyerName,
        amountUSDC: i.amountUSDC.toString(),
        status: i.status,
        dueDate: i.dueDate.toISOString(),
      }))

    // ── Portfolio risk across deployed invoices ──────────────────────────────
    const scored = deployedInvoices.filter((i) => i.riskScore !== null)
    const risk = {
      avgScore:
        scored.length > 0
          ? Math.round(
              scored.reduce((s, i) => s + (i.riskScore ?? 0), 0) / scored.length
            )
          : null,
      low: deployedInvoices.filter((i) => i.riskLabel === "LOW").length,
      medium: deployedInvoices.filter((i) => i.riskLabel === "MEDIUM").length,
      high: deployedInvoices.filter((i) => i.riskLabel === "HIGH").length,
    }

    // ── Recent activity (payments up to ref) ─────────────────────────────────
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
          createdAt: { lte: ref },
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
          activeInvoices: deployedInvoices.length,
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
