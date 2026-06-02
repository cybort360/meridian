import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { kycSubmissionSchema } from "@/lib/utils/validation"

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

    const data = {
      legalBusinessName: d.legalBusinessName,
      tradeLicenseNumber: d.tradeLicenseNumber,
      commercialRegNumber: d.commercialRegNumber,
      businessAddress: d.businessAddress,
      city: d.city,
      country: d.country,
      industry: d.industry,
      websiteUrl: d.websiteUrl || null,
      phoneNumber: d.phoneNumber,
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
    await prisma.user.update({
      where: { id: userId },
      data: { kycStatus: "PENDING_REVIEW" },
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
    console.error("[API /kyc/submit POST]", error)
    return NextResponse.json(
      { error: "Could not submit your verification. Please try again." },
      { status: 500 }
    )
  }
}
