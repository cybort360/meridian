import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/kyc/status — current user's KYC status + submission (if any).
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { kycStatus: true, kycSubmission: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 })
    }

    const submission = user.kycSubmission
      ? {
          ...user.kycSubmission,
          submittedAt: user.kycSubmission.submittedAt.toISOString(),
          reviewedAt: user.kycSubmission.reviewedAt
            ? user.kycSubmission.reviewedAt.toISOString()
            : null,
        }
      : null

    return NextResponse.json({
      data: {
        kycStatus: user.kycStatus,
        submission,
        rejectionReason:
          user.kycStatus === "REJECTED"
            ? (user.kycSubmission?.reviewNotes ?? null)
            : null,
      },
    })
  } catch (error) {
    console.error("[API /kyc/status GET]", error)
    return NextResponse.json(
      { error: "Could not load verification status." },
      { status: 500 }
    )
  }
}
