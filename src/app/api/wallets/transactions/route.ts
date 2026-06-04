import { NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getWalletTransactions } from "@/lib/circle/wallets"
import { CircleConfigError } from "@/lib/circle/client"

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

    const transactions = await getWalletTransactions(wallet.circleWalletId)

    return NextResponse.json({ data: transactions })
  } catch (error) {
    if (error instanceof CircleConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    captureError(error, { route: "API /wallets/transactions GET" })
    return NextResponse.json(
      { error: "Could not load your transactions. Please try again." },
      { status: 500 }
    )
  }
}
