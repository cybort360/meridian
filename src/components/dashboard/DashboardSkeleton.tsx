import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-slate-800 bg-slate-900">
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-28 bg-slate-800" />
              <Skeleton className="h-7 w-20 bg-slate-800" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900 lg:col-span-2">
          <CardContent className="p-5">
            <Skeleton className="h-64 w-full bg-slate-800" />
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-5">
            <Skeleton className="h-64 w-full bg-slate-800" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
