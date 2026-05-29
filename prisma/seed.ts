import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10)

  const sme = await prisma.user.upsert({
    where: { email: "sme@meridian.test" },
    update: {},
    create: {
      email: "sme@meridian.test",
      name: "Layla Hassan",
      passwordHash,
      role: "SME",
      companyName: "Gulf Trading LLC",
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
    },
  })

  console.log("Seeded users:")
  console.log(`  SME      → ${sme.email} (password: password123)`)
  console.log(`  Investor → ${investor.email} (password: password123)`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
