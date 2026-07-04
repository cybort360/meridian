import { NextRequest, NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { getServerSession } from "next-auth"
import { format } from "date-fns"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildStatementCsv } from "@/lib/statement/csv"
import type { Invoice } from "@prisma/client"

const DAY_MS = 86_400_000

// Resolve the [start, ref] window for a ?month=YYYY-MM (defaults to current).
function resolveWindow(monthParam: string | null): { start: Date; ref: Date } {
  const now = new Date()
  const m = monthParam?.match(/^(\d{4})-(\d{2})$/)
  if (m) {
    const year = Number(m[1])
    const month = Number(m[2]) - 1
    const start = new Date(year, month, 1)
    const next = new Date(year, month + 1, 1)
    const ref = next <= now ? new Date(next.getTime() - 1) : now
    return { start, ref }
  }
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), ref: now }
}

// GET /api/dashboard/statement?month=YYYY-MM - streams a formatted CSV bank
// statement for the selected month. Returned with a Content-Disposition header
// so the browser saves it with the right filename + .csv extension (a
// client-side blob download drops the name when triggered after an await).
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id
    const isInvestor = session.user.role === "INVESTOR"

    const { start, ref } = resolveWindow(
      new URL(req.url).searchParams.get("month")
    )

    const [user, wallet, invoices] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, companyName: true, role: true },
      }),
      prisma.wallet.findUnique({ where: { userId } }),
      prisma.invoice.findMany({
        where: isInvestor ? { investorId: userId } : { smeId: userId },
        orderBy: { createdAt: "desc" },
      }),
    ])

    // ── Month-scoped summary (as of `ref`, using invoice timestamps) ─────────
    const fundedBy = (i: Invoice) =>
      i.fundedAt !== null && i.fundedAt <= ref && i.status !== "CANCELLED"
    const settledBy = (i: Invoice) => i.settledAt !== null && i.settledAt <= ref
    const deployed = (i: Invoice) => fundedBy(i) && !settledBy(i)
    const defaultedBy = (i: Invoice) =>
      i.status === "DEFAULTED" && i.dueDate <= ref
    const sum = (list: Invoice[]) =>
      list.reduce((s, i) => s + i.amountUSDC, 0n).toString()

    const fundedList = invoices.filter(fundedBy)
    const deployedList = invoices.filter(deployed)
    const settledList = invoices.filter((i) => settledBy(i) && i.fundedAt)
    const dueList = deployedList.filter((i) => i.dueDate >= ref)
    const overdueList = invoices.filter(
      (i) => (deployed(i) && i.dueDate < ref) || defaultedBy(i)
    )

    const avgSettlementDays =
      settledList.length > 0
        ? Math.round(
            (settledList.reduce(
              (s, i) =>
                s + (i.settledAt!.getTime() - i.fundedAt!.getTime()) / DAY_MS,
              0
            ) /
              settledList.length) *
              10
          ) / 10
        : null
    const defaultedCount = invoices.filter(defaultedBy).length
    const resolvedCount = settledList.length + defaultedCount
    const onTimeRate =
      resolvedCount > 0
        ? Math.round((settledList.length / resolvedCount) * 100)
        : null

    const stats = {
      totalFinanced: sum(fundedList),
      totalFinancedChangePct: 0,
      capitalDeployed: sum(deployedList),
      activeInvoices: deployedList.length,
      avgSettlementDays,
      onTimeRate,
      onTimePointsThisMonth: 0,
    }
    const secondary = {
      paid: { count: settledList.length, amount: sum(settledList), changePct: 0 },
      due: { count: dueList.length, amount: sum(dueList) },
      overdue: {
        count: overdueList.length,
        amount: sum(overdueList),
        thisWeek: 0,
      },
    }

    // ── All transactions in the window (line items) ──────────────────────────
    let transactions: Array<{
      date: string
      type: string
      direction: "IN" | "OUT"
      counterparty: string
      amountUSDC: string
      status: string
      txHash: string | null
    }> = []

    if (wallet) {
      const payments = await prisma.payment.findMany({
        where: {
          createdAt: { gte: start, lte: ref },
          OR: [{ senderWalletId: wallet.id }, { receiverWalletId: wallet.id }],
        },
        include: {
          senderWallet: { include: { user: true } },
          receiverWallet: { include: { user: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 500,
      })
      transactions = payments.map((p) => {
        const outbound = p.senderWalletId === wallet.id
        const counterpartyUser = outbound
          ? p.receiverWallet.user
          : p.senderWallet.user
        return {
          date: p.createdAt.toISOString(),
          type: p.type,
          direction: outbound ? ("OUT" as const) : ("IN" as const),
          counterparty:
            counterpartyUser?.companyName ??
            counterpartyUser?.name ??
            "Escrow",
          amountUSDC: p.amountUSDC.toString(),
          status: p.status,
          txHash: p.txHash,
        }
      })
    }

    const monthLabel = format(start, "MMMM yyyy")
    const csv = buildStatementCsv({
      account: {
        name: user?.name ?? "",
        companyName: user?.companyName ?? null,
        role: user?.role ?? "SME",
        walletAddress: wallet?.address ?? null,
      },
      monthLabel,
      generatedAt: new Date(),
      stats,
      secondary,
      transactions,
    })

    const filename = `Meridian-Statement-${monthLabel.replace(/\s+/g, "-")}.csv`
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    captureError(error, { route: "API /dashboard/statement GET" })
    return NextResponse.json(
      { error: "Could not build the statement. Please try again." },
      { status: 500 }
    )
  }
}
