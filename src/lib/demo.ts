import { randomUUID, randomBytes } from "crypto"
import bcrypt from "bcryptjs"
import type { Wallet } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { createWallet } from "@/lib/circle/wallets"
import { scoreAndPersist } from "@/lib/invoices"
import { isAIConfigured } from "@/lib/ai/client"
import { toUSDCBaseUnits } from "@/lib/utils/usdc"
import { CIRCLE_BLOCKCHAIN } from "@/lib/constants"

// "Demo Autopilot" — runs the full Meridian lifecycle end-to-end for the demo
// video. Steps 1–3 use the real Circle/AI services where available; if a real
// call isn't possible (unconfigured key, unfunded wallet), it falls back to a
// clearly-scripted result so the recording never stalls. Funding/settlement are
// advanced in the DB with deterministic values rather than on-chain transfers,
// which would require pre-funded wallets and ~30s polls per leg.

export type DemoEmit = (event: object) => void | Promise<void>

const DEMO_PASSWORD = "password123"
const PAUSE_MS = 2000
const FEE_BPS = 200 // 2% investor yield

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_APP_ENV === "demo"
}

// Reuse a user's wallet if present, else create a real Circle wallet. Falls back
// to a synthesized wallet row if Circle can't be reached, so the demo proceeds.
async function ensureWallet(userId: string, refId: string): Promise<Wallet> {
  const existing = await prisma.wallet.findUnique({ where: { userId } })
  if (existing) return existing

  try {
    const created = await createWallet(refId)
    return await prisma.wallet.create({
      data: {
        userId,
        circleWalletId: created.circleWalletId,
        address: created.address,
        blockchain: created.blockchain,
      },
    })
  } catch {
    return prisma.wallet.create({
      data: {
        userId,
        circleWalletId: `demo-${randomUUID()}`,
        address: `0x${randomBytes(20).toString("hex")}`,
        blockchain: CIRCLE_BLOCKCHAIN,
      },
    })
  }
}

export async function runDemo(emit: DemoEmit): Promise<{ durationMs: number }> {
  const started = Date.now()
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  // ── Step 1: SME + investor onboarded, wallets ready ──────────────────────
  const sme = await prisma.user.upsert({
    where: { email: "sme@meridian.test" },
    update: { companyName: "Gulf Cargo LLC" },
    create: {
      email: "sme@meridian.test",
      name: "Layla Hassan",
      passwordHash,
      role: "SME",
      companyName: "Gulf Cargo LLC",
      country: "UAE",
    },
  })
  const investor = await prisma.user.upsert({
    where: { email: "investor@meridian.test" },
    update: {},
    create: {
      email: "investor@meridian.test",
      name: "Omar Reilly",
      passwordHash,
      role: "INVESTOR",
      companyName: "Meridian Capital",
      country: "UAE",
    },
  })
  const smeWallet = await ensureWallet(sme.id, `demo-sme-${sme.id}`)
  const investorWallet = await ensureWallet(investor.id, `demo-inv-${investor.id}`)
  await emit({
    type: "demo_step",
    step: 1,
    label: "SME onboarded + wallet created",
    status: "complete",
    data: { company: sme.companyName, address: smeWallet.address },
  })
  await sleep(PAUSE_MS)

  // ── Step 2: invoice submitted ────────────────────────────────────────────
  const amountUSDC = toUSDCBaseUnits(8500)
  const invoice = await prisma.invoice.create({
    data: {
      smeId: sme.id,
      title: "Freight forwarding Dubai → Riyadh",
      description: "Cross-border road freight — 3 FTL shipments of electronics.",
      buyerName: "Najm Distribution KSA",
      buyerEmail: "ap@najm-dist.example",
      amountUSDC,
      dueDate: new Date(Date.now() + 45 * 86_400_000),
      invoiceNumber: `DEMO-${Date.now().toString().slice(-6)}`,
      status: "PENDING",
    },
  })
  await emit({
    type: "demo_step",
    step: 2,
    label: "Invoice submitted",
    status: "complete",
    data: {
      title: invoice.title,
      amountUSDC: amountUSDC.toString(),
      invoiceNumber: invoice.invoiceNumber,
    },
  })
  await sleep(PAUSE_MS)

  // ── Step 3: AI risk scoring ──────────────────────────────────────────────
  let riskLabel: string | null = null
  let riskScore: number | null = null
  let advanceRate: number | null = null

  if (isAIConfigured()) {
    const scored = await scoreAndPersist(invoice.id)
    riskLabel = scored.riskLabel
    riskScore = scored.riskScore
    advanceRate = scored.advanceRate
  }
  // Curated result when AI isn't configured (or returned the neutral fallback),
  // so the showcase always presents a compelling, consistent assessment.
  if (advanceRate === null) {
    riskLabel = "LOW"
    riskScore = 18
    advanceRate = 82
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        riskLabel: "LOW",
        riskScore: 18,
        advanceRate: 82,
        riskSummary:
          "Established corridor and a repeat buyer with a strong payment history; the short tenor keeps risk low.",
      },
    })
  }
  // Simulate the buyer countersignature so the invoice is listable/fundable.
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: "SCORED", buyerSignedAt: new Date() },
  })
  await emit({
    type: "demo_step",
    step: 3,
    label: "AI risk scoring",
    status: "complete",
    data: { riskLabel, riskScore, advanceRate },
  })
  await sleep(PAUSE_MS)

  // ── Step 4: investor funds the invoice ───────────────────────────────────
  const advance = (amountUSDC * BigInt(advanceRate)) / 100n
  const yieldFee = (advance * BigInt(FEE_BPS)) / 10_000n
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "ACTIVE",
      investorId: investor.id,
      fundedAt: new Date(),
      feeAmountUSDC: yieldFee,
    },
  })
  await prisma.payment.create({
    data: {
      senderWalletId: investorWallet.id,
      receiverWalletId: smeWallet.id,
      invoiceId: invoice.id,
      amountUSDC: advance,
      type: "ADVANCE",
      status: "CONFIRMED",
      blockchain: smeWallet.blockchain,
    },
  })
  await emit({
    type: "demo_step",
    step: 4,
    label: "Investor funded",
    status: "complete",
    data: { advanceUSDC: advance.toString() },
  })
  await sleep(PAUSE_MS)

  // ── Step 5: settlement (investor repaid principal + yield) ───────────────
  const repaid = advance + yieldFee
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: "SETTLED", settledAt: new Date() },
  })
  await prisma.payment.create({
    data: {
      senderWalletId: smeWallet.id,
      receiverWalletId: investorWallet.id,
      invoiceId: invoice.id,
      amountUSDC: repaid,
      type: "SETTLEMENT",
      status: "CONFIRMED",
      blockchain: investorWallet.blockchain,
    },
  })
  const last = await prisma.creditEvent.findFirst({
    where: { userId: sme.id },
    orderBy: { createdAt: "desc" },
  })
  await prisma.creditEvent.create({
    data: {
      userId: sme.id,
      type: "INVOICE_SETTLED_ON_TIME",
      invoiceId: invoice.id,
      scoreChange: 10,
      newScore: (last?.newScore ?? 500) + 10,
    },
  })
  await emit({
    type: "demo_step",
    step: 5,
    label: "Invoice settled",
    status: "complete",
    data: { repaidUSDC: repaid.toString(), yieldUSDC: yieldFee.toString() },
  })

  const durationMs = Date.now() - started
  await emit({ type: "demo_complete", durationMs })
  return { durationMs }
}
