import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Resolve the [start, ref] window for a ?month=YYYY-MM (defaults to current).
function resolveWindow(monthParam: string | null): {
  start: Date
  ref: Date
} {
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

// GET /api/dashboard/statement?month=YYYY-MM — account info + every transaction
// touching the user's wallet within the selected month, for the PDF statement.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id

    const { start, ref } = resolveWindow(
      new URL(req.url).searchParams.get("month")
    )

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, companyName: true, role: true },
    })
    const wallet = await prisma.wallet.findUnique({ where: { userId } })

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
          direction: outbound ? "OUT" : "IN",
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

    return NextResponse.json({
      data: {
        account: {
          name: user?.name ?? "",
          companyName: user?.companyName ?? null,
          role: user?.role ?? "SME",
          walletAddress: wallet?.address ?? null,
        },
        period: { start: start.toISOString(), end: ref.toISOString() },
        transactions,
      },
    })
  } catch (error) {
    console.error("[API /dashboard/statement GET]", error)
    return NextResponse.json(
      { error: "Could not build the statement. Please try again." },
      { status: 500 }
    )
  }
}
