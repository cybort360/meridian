import { NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/user/onboarding — mark the one-time onboarding as seen.
export async function PATCH() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { hasSeenOnboarding: true },
    })

    return NextResponse.json({ data: { hasSeenOnboarding: true } }, { status: 200 })
  } catch (error) {
    captureError(error, { route: "API /user/onboarding PATCH" })
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
