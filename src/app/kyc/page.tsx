import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { KycFlow } from "./KycFlow"

// KYB/KYC onboarding for SMEs. Investors don't submit business docs.
export default async function KycPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")
  if (session.user.role === "INVESTOR") redirect("/dashboard")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { kycStatus: true },
  })
  if (user?.kycStatus === "APPROVED") redirect("/dashboard")

  return <KycFlow initialStatus={user?.kycStatus ?? "NOT_SUBMITTED"} />
}
