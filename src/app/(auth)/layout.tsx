import Link from "next/link"
import { Compass } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dark flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10 ring-1 ring-emerald-400/20">
          <Compass className="h-6 w-6 text-emerald-400" />
        </span>
        <span className="text-2xl font-semibold tracking-tight text-slate-100">
          Meridian
        </span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
