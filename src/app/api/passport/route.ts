import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const CREDIT_BASE_SCORE = 500

// GET /api/passport — on-chain credit identity for the current user.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id
    const isInvestor = session.user.role === "INVESTOR"

    const events = await prisma.creditEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })
    const creditScore = events[0]?.newScore ?? CREDIT_BASE_SCORE

    const invoices = await prisma.invoice.findMany({
      where: isInvestor ? { investorId: userId } : { smeId: userId },
      orderBy: { createdAt: "desc" },
    })

    const financed = invoices.filter((i) =>
      ["ACTIVE", "REPAID", "SETTLED"].includes(i.status)
    )
    const settled = invoices.filter((i) => i.status === "SETTLED").length
    const defaulted = invoices.filter((i) => i.status === "DEFAULTED").length

    const totalVolumeFinanced = financed.reduce((sum, i) => {
      const advance =
        i.advanceRate !== null
          ? (i.amountUSDC * BigInt(i.advanceRate)) / 100n
          : 0n
      return sum + advance
    }, 0n)

    const resolved = settled + defaulted
    const onTimeRate = resolved > 0 ? Math.round((settled / resolved) * 100) : null

    return NextResponse.json({
      data: {
        creditScore,
        totalVolumeFinanced: totalVolumeFinanced.toString(),
        onTimeRate,
        invoicesFinanced: financed.length,
        totalInvoices: invoices.length,
        events: events.map((e) => ({
          id: e.id,
          type: e.type,
          scoreChange: e.scoreChange,
          newScore: e.newScore,
          invoiceId: e.invoiceId,
          createdAt: e.createdAt.toISOString(),
        })),
        invoices: invoices.slice(0, 10).map((i) => ({
          id: i.id,
          title: i.title,
          status: i.status,
          amountUSDC: i.amountUSDC.toString(),
          createdAt: i.createdAt.toISOString(),
          settledAt: i.settledAt ? i.settledAt.toISOString() : null,
        })),
      },
    })
  } catch (error) {
    console.error("[API /passport GET]", error)
    return NextResponse.json(
      { error: "Could not load your passport. Please try again." },
      { status: 500 }
    )
  }
}
