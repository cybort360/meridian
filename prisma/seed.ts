import { PrismaClient, type RiskLabel, type InvoiceStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// Dollars → USDC base units (6 decimals) as BigInt.
const usdc = (dollars: number): bigint => BigInt(Math.round(dollars * 1_000_000))
const inDays = (days: number): Date =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000)
const agoDays = (days: number): Date =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000)

interface SeedInvoice {
  smeId: string
  title: string
  description: string
  buyerName: string
  buyerEmail: string
  amount: number
  invoiceNumber: string
  dueInDays: number
  status: InvoiceStatus
  riskScore: number
  riskLabel: RiskLabel
  riskSummary: string
  advanceRate: number
  investorId?: string
  fundedAgoDays?: number
  settledAgoDays?: number
}

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10)

  // ── Accounts ───────────────────────────────────────────────────────────────
  const sme = await prisma.user.upsert({
    where: { email: "sme@meridian.test" },
    update: { companyName: "Gulf Cargo LLC", name: "Layla Hassan", kycStatus: "APPROVED" },
    create: {
      email: "sme@meridian.test",
      name: "Layla Hassan",
      passwordHash,
      role: "SME",
      companyName: "Gulf Cargo LLC",
      country: "UAE",
      kycStatus: "APPROVED",
    },
  })

  // A second verified SME so the marketplace shows more than one business.
  const sme2 = await prisma.user.upsert({
    where: { email: "sme2@meridian.test" },
    update: { companyName: "Desert Rose Trading FZE", name: "Yusuf Karim", kycStatus: "APPROVED" },
    create: {
      email: "sme2@meridian.test",
      name: "Yusuf Karim",
      passwordHash,
      role: "SME",
      companyName: "Desert Rose Trading FZE",
      country: "UAE",
      kycStatus: "APPROVED",
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

  const admin = await prisma.user.upsert({
    where: { email: "admin@meridian.test" },
    update: { role: "ADMIN" },
    create: {
      email: "admin@meridian.test",
      name: "Meridian Admin",
      passwordHash,
      role: "ADMIN",
      country: "UAE",
    },
  })

  // ── Idempotent reseed: clear these SMEs' invoices + credit history, so
  //    repeated demo runs don't leave duplicates behind. ────────────────────
  const smeIds = [sme.id, sme2.id]
  await prisma.invoice.deleteMany({ where: { smeId: { in: smeIds } } })
  await prisma.creditEvent.deleteMany({ where: { userId: { in: smeIds } } })

  // ── A varied marketplace: SCORED invoices across both SMEs ──────────────────
  const invoices: SeedInvoice[] = [
    {
      smeId: sme.id,
      title: "Freight forwarding — Dubai to Riyadh",
      description: "Cross-border road freight, 3 FTL shipments of consumer electronics.",
      buyerName: "Najm Distribution KSA",
      buyerEmail: "ap@najm-dist.example",
      amount: 18000,
      invoiceNumber: "GC-2041",
      dueInDays: 45,
      status: "SCORED",
      riskScore: 28,
      riskLabel: "LOW",
      riskSummary:
        "Established buyer with on-time payment history; short tenor and strong corridor demand keep risk low.",
      advanceRate: 85,
    },
    {
      smeId: sme.id,
      title: "Customs brokerage retainer — Q3",
      description: "Quarterly customs brokerage and documentation across Jebel Ali.",
      buyerName: "Gulf Petrochem Industries",
      buyerEmail: "payables@gulfpetrochem.example",
      amount: 32000,
      invoiceNumber: "GC-2044",
      dueInDays: 60,
      status: "SCORED",
      riskScore: 52,
      riskLabel: "MEDIUM",
      riskSummary:
        "Large ticket with a creditworthy buyer; longer tenor and concentration warrant a moderate advance.",
      advanceRate: 78,
    },
    {
      smeId: sme.id,
      title: "Reefer logistics — cold chain Q3",
      description: "Temperature-controlled distribution for 12 reefer containers.",
      buyerName: "Emirates Cold Chain",
      buyerEmail: "finance@coldchain.example",
      amount: 9500,
      invoiceNumber: "GC-2046",
      dueInDays: 30,
      status: "SCORED",
      riskScore: 33,
      riskLabel: "LOW",
      riskSummary: "Repeat buyer, short tenor, reliable settlement behaviour.",
      advanceRate: 82,
    },
    {
      smeId: sme2.id,
      title: "Cotton textile export — Mumbai",
      description: "Export consignment of finished cotton apparel, FOB Jebel Ali.",
      buyerName: "Mumbai Apparel Co",
      buyerEmail: "ap@mumbaiapparel.example",
      amount: 24500,
      invoiceNumber: "DR-1007",
      dueInDays: 50,
      status: "SCORED",
      riskScore: 49,
      riskLabel: "MEDIUM",
      riskSummary:
        "Cross-border buyer with limited history on this corridor; moderate FX and tenor risk.",
      advanceRate: 76,
    },
    {
      smeId: sme2.id,
      title: "Home goods wholesale — Levant",
      description: "Wholesale homeware supply to a regional retail chain.",
      buyerName: "Levant Retail Group",
      buyerEmail: "payables@levantretail.example",
      amount: 14200,
      invoiceNumber: "DR-1009",
      dueInDays: 38,
      status: "SCORED",
      riskScore: 31,
      riskLabel: "LOW",
      riskSummary: "Strong regional retailer, consistent on-time payments.",
      advanceRate: 84,
    },
    {
      smeId: sme2.id,
      title: "Commodities supply — spices & dry goods",
      description: "Bulk spices and dry goods to a wholesale marketplace operator.",
      buyerName: "Doha Souq Holdings",
      buyerEmail: "finance@dohasouq.example",
      amount: 41000,
      invoiceNumber: "DR-1012",
      dueInDays: 72,
      status: "SCORED",
      riskScore: 71,
      riskLabel: "HIGH",
      riskSummary:
        "Long tenor, large ticket and a buyer with thin public credit data — priced for higher risk.",
      advanceRate: 68,
    },
    // ── Funded + settled, for the dashboard & credit-passport story ──────────
    {
      smeId: sme.id,
      title: "Customs clearance — Jebel Ali Port",
      description: "Import clearance and documentation for 12 reefer containers.",
      buyerName: "Emirates Cold Chain",
      buyerEmail: "finance@coldchain.example",
      amount: 7500,
      invoiceNumber: "GC-2038",
      dueInDays: 18,
      status: "ACTIVE",
      riskScore: 47,
      riskLabel: "MEDIUM",
      riskSummary:
        "Reliable counterparty but seasonal cash-flow variability warrants a moderate advance rate.",
      advanceRate: 75,
      investorId: investor.id,
      fundedAgoDays: 6,
    },
    {
      smeId: sme.id,
      title: "Last-mile delivery — Abu Dhabi corridor",
      description: "30-day last-mile distribution contract across Abu Dhabi.",
      buyerName: "Capital Retail Group",
      buyerEmail: "payables@capitalretail.example",
      amount: 12000,
      invoiceNumber: "GC-2025",
      dueInDays: -2,
      status: "SETTLED",
      riskScore: 35,
      riskLabel: "LOW",
      riskSummary:
        "Repeat buyer, settled on time; advance fully recovered with yield to investor.",
      advanceRate: 80,
      investorId: investor.id,
      fundedAgoDays: 34,
      settledAgoDays: 1,
    },
  ]

  let settledId: string | null = null
  for (const i of invoices) {
    const created = await prisma.invoice.create({
      data: {
        smeId: i.smeId,
        investorId: i.investorId,
        title: i.title,
        description: i.description,
        buyerName: i.buyerName,
        buyerEmail: i.buyerEmail,
        amountUSDC: usdc(i.amount),
        invoiceNumber: i.invoiceNumber,
        dueDate: inDays(i.dueInDays),
        status: i.status,
        riskScore: i.riskScore,
        riskLabel: i.riskLabel,
        riskSummary: i.riskSummary,
        advanceRate: i.advanceRate,
        fundedAt: i.fundedAgoDays != null ? agoDays(i.fundedAgoDays) : null,
        settledAt: i.settledAgoDays != null ? agoDays(i.settledAgoDays) : null,
      },
    })
    if (i.status === "SETTLED") settledId = created.id
  }

  if (settledId) {
    await prisma.creditEvent.create({
      data: {
        userId: sme.id,
        type: "INVOICE_SETTLED_ON_TIME",
        invoiceId: settledId,
        scoreChange: 10,
        newScore: 510,
      },
    })
  }

  const scored = invoices.filter((i) => i.status === "SCORED").length
  console.log("Seeded demo data:")
  console.log(`  SME      → ${sme.email} (Gulf Cargo LLC, password: password123)`)
  console.log(`  SME #2   → ${sme2.email} (Desert Rose Trading FZE, password: password123)`)
  console.log(`  Investor → ${investor.email} (password: password123)`)
  console.log(`  Admin    → ${admin.email} (password: password123)`)
  console.log(
    `  Invoices → ${invoices.length} (${scored} SCORED in marketplace, 1 ACTIVE, 1 SETTLED) + 1 credit event`
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
