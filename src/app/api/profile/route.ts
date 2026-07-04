import { NextRequest, NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateProfileSchema } from "@/lib/utils/validation"

// The fields safe to expose to the client. Never select passwordHash.
const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  companyName: true,
  country: true,
  kycStatus: true,
  createdAt: true,
} as const

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: PROFILE_SELECT,
    })
    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 })
    }

    return NextResponse.json({ data: user }, { status: 200 })
  } catch (error) {
    captureError(error, { route: "API /profile GET" })
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = updateProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Company name + country are verified-identity fields tied to the KYB
    // record. Once a business is under review or approved, they're locked
    // server-side - only the display name may change. This is the authoritative
    // gate; the UI lock is cosmetic.
    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { kycStatus: true },
    })
    const identityLocked =
      current?.kycStatus === "PENDING_REVIEW" ||
      current?.kycStatus === "APPROVED"

    const data = identityLocked
      ? { name: parsed.data.name }
      : parsed.data

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: PROFILE_SELECT,
    })

    return NextResponse.json({ data: user }, { status: 200 })
  } catch (error) {
    captureError(error, { route: "API /profile PATCH" })
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
