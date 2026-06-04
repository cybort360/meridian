import { NextRequest, NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { scoreInvoiceSchema } from "@/lib/utils/invoiceValidation"
import { scoreAndPersist, serializeInvoice } from "@/lib/invoices"

// POST /api/ai/score — (re)score an invoice the caller owns.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = scoreInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: parsed.data.invoiceId },
      select: { smeId: true },
    })
    if (!invoice || invoice.smeId !== session.user.id) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const scored = await scoreAndPersist(parsed.data.invoiceId)

    return NextResponse.json({ data: serializeInvoice(scored) })
  } catch (error) {
    captureError(error, { route: "API /ai/score POST" })
    return NextResponse.json(
      { error: "Could not score the invoice. Please try again." },
      { status: 500 }
    )
  }
}
