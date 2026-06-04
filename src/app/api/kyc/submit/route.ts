import { NextRequest, NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { getServerSession } from "next-auth"
import { access } from "fs/promises"
import path from "path"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { kycSubmissionSchema } from "@/lib/utils/validation"
import { sanitizeText } from "@/lib/utils/sanitize"
import {
  KYC_DIR,
  isValidKey,
  keyBelongsTo,
  keyFromUrl,
} from "@/lib/kycStorage"

// Confirms a document URL points to a file the current user actually uploaded,
// preventing one user from attaching another user's documents to their submission.
async function ownsDocument(url: string | undefined, userId: string): Promise<boolean> {
  if (!url) return false
  const key = keyFromUrl(url)
  if (!key || !isValidKey(key) || !keyBelongsTo(key, userId)) return false
  try {
    await access(path.join(KYC_DIR, path.basename(key)))
    return true
  } catch {
    return false
  }
}

// POST /api/kyc/submit — SME submits business details + document URLs.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = kycSubmissionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const d = parsed.data
    const userId = session.user.id

    // Verify document ownership — reject references to files this user doesn't own.
    const tradeOk = await ownsDocument(d.tradeLicenseDocUrl, userId)
    const ownerOk = await ownsDocument(d.ownerIdDocUrl, userId)
    const proofOk = !d.proofOfAddressUrl || (await ownsDocument(d.proofOfAddressUrl, userId))
    if (!tradeOk || !ownerOk || !proofOk) {
      return NextResponse.json(
        { error: "Invalid or unauthorized document reference." },
        { status: 400 }
      )
    }

    // Strip any markup from free-text fields before persisting — these render in
    // the admin review screen, and legalBusinessName becomes the user's public
    // companyName shown to investors, so an unsanitized value is a stored-XSS path.
    const legalBusinessName = sanitizeText(d.legalBusinessName)
    const country = sanitizeText(d.country)

    const data = {
      legalBusinessName,
      tradeLicenseNumber: sanitizeText(d.tradeLicenseNumber),
      commercialRegNumber: sanitizeText(d.commercialRegNumber),
      businessAddress: sanitizeText(d.businessAddress),
      city: sanitizeText(d.city),
      country,
      industry: sanitizeText(d.industry),
      websiteUrl: d.websiteUrl || null,
      phoneNumber: sanitizeText(d.phoneNumber),
      tradeLicenseDocUrl: d.tradeLicenseDocUrl,
      ownerIdDocUrl: d.ownerIdDocUrl,
      proofOfAddressUrl: d.proofOfAddressUrl || null,
      reviewedAt: null,
      reviewNotes: null,
    }

    // Upsert so a rejected SME can resubmit.
    await prisma.kycSubmission.upsert({
      where: { userId },
      create: { userId, ...data },
      update: { ...data, submittedAt: new Date() },
    })
    // Bind the user's displayed identity to the verified KYB record, so the
    // company name investors see is the legal business name under review — not
    // an arbitrary free-text value. These fields lock once review starts.
    await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: "PENDING_REVIEW",
        companyName: legalBusinessName,
        country,
      },
    })

    // Sandbox/demo: auto-approve shortly after submission so the flow completes
    // without a human reviewer. (Dev server stays alive long enough for this.)
    if (process.env.NEXT_PUBLIC_APP_ENV === "demo") {
      setTimeout(() => {
        void prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: { kycStatus: "APPROVED" },
          }),
          prisma.kycSubmission.update({
            where: { userId },
            data: {
              reviewedAt: new Date(),
              reviewNotes: "Auto-approved (sandbox)",
            },
          }),
        ])
      }, 3000)
    }

    return NextResponse.json({
      status: "pending",
      message: "Submitted for review",
    })
  } catch (error) {
    captureError(error, { route: "API /kyc/submit POST" })
    return NextResponse.json(
      { error: "Could not submit your verification. Please try again." },
      { status: 500 }
    )
  }
}
