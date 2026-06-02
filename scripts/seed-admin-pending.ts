import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10)

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

  // A SME stuck in PENDING_REVIEW so there's something to manually approve
  // (demo mode auto-approves the normal submit flow after 3s).
  const pending = await prisma.user.upsert({
    where: { email: "pending-sme@meridian.test" },
    update: { kycStatus: "PENDING_REVIEW" },
    create: {
      email: "pending-sme@meridian.test",
      name: "Sara Nakamura",
      passwordHash,
      role: "SME",
      companyName: "Falcon Logistics FZE",
      country: "UAE",
      kycStatus: "PENDING_REVIEW",
    },
  })

  await prisma.kycSubmission.upsert({
    where: { userId: pending.id },
    update: { reviewedAt: null, reviewNotes: null },
    create: {
      userId: pending.id,
      legalBusinessName: "Falcon Logistics FZE",
      tradeLicenseNumber: "998877-UAE-2024",
      commercialRegNumber: "CN-9988770",
      businessAddress: "Warehouse 7, JAFZA",
      city: "Dubai",
      country: "UAE",
      industry: "Logistics & Freight",
      phoneNumber: "+971 4 888 9900",
      tradeLicenseDocUrl: "/api/kyc/document/placeholder-tradeLicense-doc.pdf",
      ownerIdDocUrl: "/api/kyc/document/placeholder-ownerId-doc.pdf",
    },
  })

  console.log(`Admin   → ${admin.email} (role ${admin.role})`)
  console.log(`Pending → ${pending.email} (kycStatus ${pending.kycStatus})`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
