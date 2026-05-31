import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// Dollars → USDC base units (6 decimals) as BigInt.
const usdc = (dollars: number): bigint => BigInt(Math.round(dollars * 1_000_000))
const inDays = (days: number): Date =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000)
const agoDays = (days: number): Date =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000)

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10)

  const sme = await prisma.user.upsert({
    where: { email: "sme@meridian.test" },
    update: { companyName: "Gulf Cargo LLC", name: "Layla Hassan" },
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

  // Idempotent reseed: clear this SME's demo invoices + credit history.
  await prisma.invoice.deleteMany({ where: { smeId: sme.id } })
  await prisma.creditEvent.deleteMany({ where: { userId: sme.id } })

  // 1) SCORED — listed in the marketplace, awaiting an investor.
  await prisma.invoice.create({
    data: {
      smeId: sme.id,
      title: "Freight forwarding services — Dubai to Riyadh",
      description:
        "Cross-border road freight, 3 FTL shipments of consumer electronics.",
      buyerName: "Najm Distribution KSA",
      buyerEmail: "ap@najm-dist.example",
      amountUSDC: usdc(18000),
      invoiceNumber: "GC-2041",
      dueDate: inDays(45),
      status: "SCORED",
      riskScore: 28,
      riskLabel: "LOW",
      riskSummary:
        "Established buyer with on-time payment history; short tenor and strong corridor demand keep risk low.",
      advanceRate: 85,
    },
  })

  // 2) ACTIVE — funded by the investor, capital disbursed to the SME.
  await prisma.invoice.create({
    data: {
      smeId: sme.id,
      investorId: investor.id,
      title: "Customs clearance — Jebel Ali Port",
      description: "Import clearance and documentation for 12 reefer containers.",
      buyerName: "Emirates Cold Chain",
      buyerEmail: "finance@coldchain.example",
      amountUSDC: usdc(7500),
      invoiceNumber: "GC-2038",
      dueDate: inDays(18),
      status: "ACTIVE",
      riskScore: 47,
      riskLabel: "MEDIUM",
      riskSummary:
        "Reliable counterparty but seasonal cash-flow variability warrants a moderate advance rate.",
      advanceRate: 75,
      fundedAt: agoDays(6),
    },
  })

  // 3) SETTLED — repaid by the buyer, investor paid out; builds credit history.
  const settled = await prisma.invoice.create({
    data: {
      smeId: sme.id,
      investorId: investor.id,
      title: "Last-mile delivery — Abu Dhabi corridor",
      description: "30-day last-mile distribution contract across Abu Dhabi.",
      buyerName: "Capital Retail Group",
      buyerEmail: "payables@capitalretail.example",
      amountUSDC: usdc(12000),
      invoiceNumber: "GC-2025",
      dueDate: agoDays(2),
      status: "SETTLED",
      riskScore: 35,
      riskLabel: "LOW",
      riskSummary:
        "Repeat buyer, settled on time; advance fully recovered with yield to investor.",
      advanceRate: 80,
      fundedAt: agoDays(34),
      settledAt: agoDays(1),
    },
  })

  await prisma.creditEvent.create({
    data: {
      userId: sme.id,
      type: "INVOICE_SETTLED_ON_TIME",
      invoiceId: settled.id,
      scoreChange: 10,
      newScore: 510,
    },
  })

  console.log("Seeded demo data:")
  console.log(`  SME      → ${sme.email} (Gulf Cargo LLC, password: password123)`)
  console.log(`  Investor → ${investor.email} (password: password123)`)
  console.log("  Invoices → 3 (SCORED, ACTIVE, SETTLED) + 1 credit event")
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
