import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const bar = "bg-slate-800"

export function InvoiceGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-slate-800 bg-slate-900">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <Skeleton className={`h-4 w-32 ${bar}`} />
              <Skeleton className={`h-5 w-16 ${bar}`} />
            </div>
            <Skeleton className={`h-7 w-28 ${bar}`} />
            <Skeleton className={`h-3 w-24 ${bar}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function WalletSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="border-slate-800 bg-slate-900">
            <CardContent className="space-y-4 p-5">
              <Skeleton className={`h-4 w-24 ${bar}`} />
              <Skeleton className={`h-9 w-40 ${bar}`} />
              <Skeleton className={`h-12 w-full ${bar}`} />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="p-5">
          <Skeleton className={`h-40 w-full ${bar}`} />
        </CardContent>
      </Card>
    </div>
  )
}

export function PassportSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="flex justify-center p-5">
            <Skeleton className={`h-40 w-40 rounded-full ${bar}`} />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-slate-800 bg-slate-900">
              <CardContent className="space-y-3 p-5">
                <Skeleton className={`h-4 w-28 ${bar}`} />
                <Skeleton className={`h-7 w-20 ${bar}`} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="p-5">
          <Skeleton className={`h-32 w-full ${bar}`} />
        </CardContent>
      </Card>
    </div>
  )
}
