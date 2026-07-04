import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { settleInvoice, SettlementError } from "@/lib/settlement"
import { serializeInvoice } from "@/lib/invoices"
import { CircleConfigError } from "@/lib/circle/client"
import { enforceRateLimit, paymentLimiter } from "@/lib/rateLimit"
import { captureError } from "@/lib/observability"

// POST /api/invoices/[id]/settle - simulate buyer repayment + investor payout.
// Settlement moves USDC OUT of the SME wallet, so only the SME may trigger it
// ("Mark as repaid"). Allowing the investor here would let them pull funds from
// the SME before the buyer has actually paid.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const limited = await enforceRateLimit(req, paymentLimiter)
    if (limited) return limited

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      select: { smeId: true },
    })
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }
    if (invoice.smeId !== session.user.id) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const settled = await settleInvoice(params.id)
    return NextResponse.json({ data: serializeInvoice(settled) })
  } catch (error) {
    if (error instanceof CircleConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    if (error instanceof SettlementError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    captureError(error, { route: "/api/invoices/[id]/settle", invoiceId: params.id })
    return NextResponse.json(
      { error: "Could not settle the invoice. Please try again." },
      { status: 500 }
    )
  }
}
