import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { settleInvoice, SettlementError } from "@/lib/settlement"
import { serializeInvoice } from "@/lib/invoices"
import { CircleConfigError } from "@/lib/circle/client"

// POST /api/invoices/[id]/settle — simulate buyer repayment + investor payout.
// Triggered by the SME ("Mark as repaid") or the funding investor.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      select: { smeId: true, investorId: true },
    })
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }
    const allowed =
      invoice.smeId === session.user.id ||
      invoice.investorId === session.user.id
    if (!allowed) {
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
    console.error("[API /invoices/[id]/settle POST]", error)
    return NextResponse.json(
      { error: "Could not settle the invoice. Please try again." },
      { status: 500 }
    )
  }
}
