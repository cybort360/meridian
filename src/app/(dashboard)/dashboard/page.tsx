import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const PLACEHOLDER_STATS = [
  { label: "Total Volume Financed", value: "—" },
  { label: "Active Invoices", value: "—" },
  { label: "Average Risk Score", value: "—" },
  { label: "On-Time Rate", value: "—" },
]

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Welcome back, {session?.user?.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Your trade finance overview will appear here as you create and fund
          invoices.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLACEHOLDER_STATS.map((stat) => (
          <Card
            key={stat.label}
            className="border-slate-800 bg-slate-900 text-slate-100"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-2xl font-semibold text-emerald-400">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardContent className="py-12 text-center text-sm text-slate-500">
          Live charts, activity feed, and corridor map land in a later phase.
        </CardContent>
      </Card>
    </div>
  )
}
