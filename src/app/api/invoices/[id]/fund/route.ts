import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { fundInvoice, SettlementError } from "@/lib/settlement"
import { serializeInvoice } from "@/lib/invoices"
import { CircleConfigError } from "@/lib/circle/client"

// POST /api/invoices/[id]/fund — an investor funds a scored invoice.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "INVESTOR") {
      return NextResponse.json(
        { error: "Only investor accounts can fund invoices." },
        { status: 403 }
      )
    }

    const invoice = await fundInvoice(params.id, session.user.id)
    return NextResponse.json({ data: serializeInvoice(invoice) })
  } catch (error) {
    if (error instanceof CircleConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    if (error instanceof SettlementError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[API /invoices/[id]/fund POST]", error)
    return NextResponse.json(
      { error: "Could not fund the invoice. Please try again." },
      { status: 500 }
    )
  }
}
