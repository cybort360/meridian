import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/kyc/approve/[userId] — admin approves a pending submission.
export async function POST(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { userId } = params
    await prisma.user.update({
      where: { id: userId },
      data: { kycStatus: "APPROVED" },
    })
    await prisma.kycSubmission.updateMany({
      where: { userId },
      data: { reviewedAt: new Date(), reviewNotes: "Approved by admin" },
    })

    return NextResponse.json({ data: { kycStatus: "APPROVED" } })
  } catch (error) {
    console.error("[API /kyc/approve POST]", error)
    return NextResponse.json(
      { error: "Could not approve the submission." },
      { status: 500 }
    )
  }
}
