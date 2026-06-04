import { NextRequest, NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { serializeInvoice } from "@/lib/invoices"

export async function GET(
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
      include: { sme: true, investor: true },
    })
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Visible to the owning SME, the assigned investor, or any investor while
    // the invoice is listed (SCORED) in the marketplace.
    const isOwner = invoice.smeId === session.user.id
    const isInvestor = invoice.investorId === session.user.id
    const isMarketplaceVisible =
      session.user.role === "INVESTOR" && invoice.status === "SCORED"

    if (!isOwner && !isInvestor && !isMarketplaceVisible) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    return NextResponse.json({ data: serializeInvoice(invoice) })
  } catch (error) {
    captureError(error, { route: "API /invoices/[id] GET" })
    return NextResponse.json(
      { error: "Could not load the invoice. Please try again." },
      { status: 500 }
    )
  }
}
