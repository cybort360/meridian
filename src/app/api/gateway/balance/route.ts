import { NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUnifiedBalance } from "@/lib/circle/gateway"

// GET /api/gateway/balance - the user's unified USDC balance across chains,
// read from the Gateway API for their wallet's depositor address.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
    })
    if (!wallet) {
      return NextResponse.json(
        { error: "You don't have a wallet yet.", code: "NO_WALLET" },
        { status: 404 }
      )
    }

    const balance = await getUnifiedBalance(wallet.address)
    return NextResponse.json({ data: balance })
  } catch (error) {
    captureError(error, { route: "API /gateway/balance GET" })
    return NextResponse.json(
      { error: "Could not load your unified balance. Please try again." },
      { status: 500 }
    )
  }
}
