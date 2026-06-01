import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { computeCreditScore } from "@/lib/utils/creditScore"

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// GET /api/dashboard — overview metrics, recent activity, and a USDC flow series
// for the current user (SME or investor).
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
    })

    const settled = invoices.filter((i) => i.status === "SETTLED").length
    const defaulted = invoices.filter((i) => i.status === "DEFAULTED").length
    const activeInvoices = invoices.filter((i) => i.status === "ACTIVE").length

    const totalVolumeFinanced = invoices
      .filter((i) => ["ACTIVE", "REPAID", "SETTLED"].includes(i.status))
      .reduce((sum, i) => {
        const advance =
          i.advanceRate !== null
            ? (i.amountUSDC * BigInt(i.advanceRate)) / 100n
            : 0n
        return sum + advance
      }, 0n)

    // Credit Score from the shared FICO-style utility (300–850).
    const { score: creditScore } = await computeCreditScore(userId)

    const resolved = settled + defaulted
    const onTimeRate =
      resolved > 0 ? Math.round((settled / resolved) * 100) : null

    // Net credit-score movement over the last 30 days, from CreditEvents.
    const since = new Date(Date.now() - 30 * 86_400_000)
    const recentEvents = await prisma.creditEvent.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { scoreChange: true },
    })
    const creditScoreChange30d = recentEvents.reduce(
      (sum, e) => sum + e.scoreChange,
      0
    )

    // Repayment rate: settled vs. (settled + defaulted); 100% when no defaults.
    const repaymentRate =
      defaulted === 0
        ? 100
        : Math.round((settled / (settled + defaulted)) * 100)

    // Payments touching this user's wallet, for activity + flow.
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
    const flowByDay = new Map<string, bigint>()

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
        take: 50,
      })

      recentActivity = payments.slice(0, 10).map((p) => {
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

      for (const p of payments) {
        const key = dayKey(p.createdAt)
        flowByDay.set(key, (flowByDay.get(key) ?? 0n) + p.amountUSDC)
      }
    }

    // Build a continuous 30-day flow series (base units as string per day).
    const flow: Array<{ date: string; amount: string }> = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = dayKey(d)
      flow.push({ date: key, amount: (flowByDay.get(key) ?? 0n).toString() })
    }

    return NextResponse.json({
      data: {
        stats: {
          totalVolumeFinanced: totalVolumeFinanced.toString(),
          activeInvoices,
          creditScore,
          onTimeRate,
          creditScoreChange30d,
          settledInvoices: settled,
          repaymentRate,
        },
        recentActivity,
        flow,
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
