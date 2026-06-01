import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { OnboardingView } from "./OnboardingView"

// One-time onboarding. Guarded server-side: unauthenticated users go to login,
// and anyone who has already seen it skips straight to the dashboard.
export default async function OnboardingPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hasSeenOnboarding: true },
  })
  if (user?.hasSeenOnboarding) redirect("/dashboard")

  return <OnboardingView />
}
