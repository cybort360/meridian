import { NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { computeCreditScore } from "@/lib/utils/creditScore"

// GET /api/passport - on-chain credit identity for the current user (as SME).
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id

    const credit = await computeCreditScore(userId)

    const invoices = await prisma.invoice.findMany({
      where: { smeId: userId },
      orderBy: { createdAt: "desc" },
    })

    const activeInvoices = invoices.filter((i) => i.status === "ACTIVE").length
    const resolved = credit.invoicesSettled + credit.invoicesDefaulted
    const onTimeRate =
      resolved > 0
        ? Math.round((credit.invoicesSettled / resolved) * 100)
        : null

    // Average days to settle across settled invoices.
    const settledInvoices = invoices.filter((i) => i.status === "SETTLED")
    let avgDaysToSettle: number | null = null
    if (settledInvoices.length > 0) {
      const totalDays = settledInvoices.reduce((sum, i) => {
        const end = i.settledAt ?? i.updatedAt
        return (
          sum +
          Math.max(
            0,
            Math.round((end.getTime() - i.createdAt.getTime()) / 86_400_000)
          )
        )
      }, 0)
      avgDaysToSettle = Math.round(totalDays / settledInvoices.length)
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } })

    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true, kycSubmission: true },
    })
    const sub = account?.kycSubmission
    const kyc = {
      status: account?.kycStatus ?? "NOT_SUBMITTED",
      businessName: sub?.legalBusinessName ?? null,
      // Mask the trade license: first 4 chars + ****
      tradeLicenseMasked: sub?.tradeLicenseNumber
        ? `${sub.tradeLicenseNumber.slice(0, 4)}****`
        : null,
    }

    return NextResponse.json({
      data: {
        kyc,
        score: credit.score,
        label: credit.label,
        totalEvents: credit.totalEvents,
        invoicesSettled: credit.invoicesSettled,
        invoicesDefaulted: credit.invoicesDefaulted,
        totalVolumeUSDC: credit.totalVolumeUSDC,
        onTimeRate,
        avgDaysToSettle,
        activeInvoices,
        address: wallet?.address ?? null,
        blockchain: wallet?.blockchain ?? "ARC-TESTNET",
        invoices: invoices.map((i) => ({
          id: i.id,
          title: i.title,
          status: i.status,
          amountUSDC: i.amountUSDC.toString(),
          createdAt: i.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    captureError(error, { route: "API /passport GET" })
    return NextResponse.json(
      { error: "Could not load your passport. Please try again." },
      { status: 500 }
    )
  }
}
