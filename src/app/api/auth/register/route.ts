import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { registerSchema } from "@/lib/utils/validation"
import { createWallet } from "@/lib/circle/wallets"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, password, companyName, role } = parsed.data
    const normalizedEmail = email.toLowerCase()

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        companyName,
        role,
      },
      select: { id: true, email: true, name: true, role: true },
    })

    // Provision a Circle wallet on Arc. Non-fatal: if Circle isn't configured
    // yet, registration still succeeds and the user can create a wallet later
    // from the Wallet page.
    try {
      const created = await createWallet(user.id)
      await prisma.wallet.create({
        data: {
          userId: user.id,
          circleWalletId: created.circleWalletId,
          address: created.address,
          blockchain: created.blockchain,
        },
      })
    } catch (walletError) {
      console.warn(
        "[register] wallet provisioning skipped:",
        walletError instanceof Error ? walletError.message : walletError
      )
    }

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (error) {
    console.error("[API /auth/register POST]", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
