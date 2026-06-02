import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { MobileNav } from "@/components/layout/MobileNav"
import { KycBanner } from "@/components/kyc/KycBanner"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  // KYC banner is for SMEs only (investors don't submit business docs).
  const user =
    session.user.role === "SME"
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { kycStatus: true },
        })
      : null

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {user && <KycBanner status={user.kycStatus} />}
        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>
      <MobileNav />
    </div>
  )
}
