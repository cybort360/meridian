import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"
import { createInvoiceSchema } from "@/lib/utils/invoiceValidation"
import { toUSDCBaseUnits, fromUSDCBaseUnits, formatUSDC } from "@/lib/utils/usdc"
import { scoreAndPersist, serializeInvoice } from "@/lib/invoices"
import { sendEmail } from "@/lib/email"
import type { Prisma } from "@prisma/client"

const VALID_STATUSES = [
  "PENDING",
  "SCORED",
  "FUNDED",
  "ACTIVE",
  "REPAID",
  "SETTLED",
  "DEFAULTED",
  "CANCELLED",
] as const

// GET /api/invoices
//   ?scope=market  → all SCORED invoices (investor marketplace)
//   default        → current user's invoices (SME: created, Investor: funded)
//   ?status=...    → optional status filter
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const scope = searchParams.get("scope")
    const status = searchParams.get("status")

    const where: Prisma.InvoiceWhereInput =
      scope === "market"
        ? // Only list invoices from KYC-approved SMEs in the marketplace.
          { status: "SCORED", sme: { kycStatus: "APPROVED" } }
        : session.user.role === "INVESTOR"
          ? { investorId: session.user.id }
          : { smeId: session.user.id }

    if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
      where.status = status as (typeof VALID_STATUSES)[number]
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { sme: true, investor: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: invoices.map(serializeInvoice) })
  } catch (error) {
    console.error("[API /invoices GET]", error)
    return NextResponse.json(
      { error: "Could not load invoices. Please try again." },
      { status: 500 }
    )
  }
}

// POST /api/invoices — SME creates an invoice; AI scoring runs immediately.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "SME") {
      return NextResponse.json(
        { error: "Only SME accounts can create invoices." },
        { status: 403 }
      )
    }

    // Gate on business verification.
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { kycStatus: true },
    })
    if (user?.kycStatus !== "APPROVED") {
      return NextResponse.json(
        {
          error:
            "Business verification required before creating invoices. Please complete KYC.",
        },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = createInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const data = parsed.data

    const verificationToken = randomUUID()

    const created = await prisma.invoice.create({
      data: {
        smeId: session.user.id,
        title: data.title,
        description: data.description,
        buyerName: data.buyerName,
        buyerEmail: data.buyerEmail,
        amountUSDC: toUSDCBaseUnits(data.amountUSDC),
        dueDate: new Date(data.dueDate),
        invoiceNumber: data.invoiceNumber,
        status: "PENDING",
        buyerVerificationToken: verificationToken,
      },
    })

    // Score now (sets risk fields). Status stays PENDING until the buyer
    // countersigns via the verification email — only then is it listable.
    const scored = await scoreAndPersist(created.id)

    // Send the buyer a verification (countersign) email. Non-fatal.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const link = `${appUrl}/verify-invoice?token=${verificationToken}`
    const company = scored.sme?.companyName ?? scored.sme?.name ?? "a supplier"
    const amountUsd = formatUSDC(fromUSDCBaseUnits(scored.amountUSDC))
    await sendEmail({
      to: data.buyerEmail,
      subject: `Action Required: Please confirm invoice #${data.invoiceNumber} from ${company}`,
      text:
        `${company} has submitted an invoice for financing and needs you to confirm it.\n\n` +
        `Invoice #${data.invoiceNumber}\n` +
        `Amount: USDC ${amountUsd}\n` +
        `Due: ${new Date(data.dueDate).toDateString()}\n\n` +
        `If this invoice is legitimate, confirm it here:\n${link}\n\n` +
        `Confirming lets ${company} access financing against this invoice. ` +
        `If you don't recognize it, you can ignore this email.`,
    })

    return NextResponse.json({ data: serializeInvoice(scored) }, { status: 201 })
  } catch (error) {
    console.error("[API /invoices POST]", error)
    return NextResponse.json(
      { error: "Could not create the invoice. Please try again." },
      { status: 500 }
    )
  }
}
