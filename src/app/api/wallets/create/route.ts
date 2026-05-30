import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createWallet } from "@/lib/circle/wallets"
import { CircleConfigError } from "@/lib/circle/client"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Idempotent: a user has at most one wallet.
    const existing = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
    })
    if (existing) {
      return NextResponse.json(
        {
          data: {
            circleWalletId: existing.circleWalletId,
            address: existing.address,
            blockchain: existing.blockchain,
          },
        },
        { status: 200 }
      )
    }

    const created = await createWallet(session.user.id)

    const wallet = await prisma.wallet.create({
      data: {
        userId: session.user.id,
        circleWalletId: created.circleWalletId,
        address: created.address,
        blockchain: created.blockchain,
      },
    })

    return NextResponse.json(
      {
        data: {
          circleWalletId: wallet.circleWalletId,
          address: wallet.address,
          blockchain: wallet.blockchain,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof CircleConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    console.error("[API /wallets/create POST]", error)
    return NextResponse.json(
      { error: "Could not create a wallet. Please try again." },
      { status: 500 }
    )
  }
}
