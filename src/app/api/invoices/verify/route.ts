import { NextRequest, NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { prisma } from "@/lib/prisma"
import { fromUSDCBaseUnits, formatUSDC } from "@/lib/utils/usdc"

// GET /api/invoices/verify?token=... - buyer countersigns the invoice.
// Public (no auth): the magic-link token is the credential.
export async function GET(req: NextRequest) {
  try {
    const token = new URL(req.url).searchParams.get("token")
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { buyerVerificationToken: token },
    })
    if (!invoice) {
      return NextResponse.json(
        { error: "Invalid or unknown verification link." },
        { status: 404 }
      )
    }
    if (invoice.buyerSignedAt) {
      return NextResponse.json({ error: "Already verified" }, { status: 400 })
    }

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        buyerSignature: "buyer-confirmed",
        buyerSignedAt: new Date(),
        status: "SCORED", // only now is the invoice listable to investors
      },
    })

    return NextResponse.json({
      data: {
        invoiceNumber: updated.invoiceNumber,
        amountUSDC: formatUSDC(fromUSDCBaseUnits(updated.amountUSDC)),
        buyerSignedAt: updated.buyerSignedAt?.toISOString() ?? null,
      },
    })
  } catch (error) {
    captureError(error, { route: "API /invoices/verify GET" })
    return NextResponse.json(
      { error: "Could not verify the invoice. Please try again." },
      { status: 500 }
    )
  }
}
