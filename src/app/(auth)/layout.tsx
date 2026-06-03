import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dark flex min-h-screen flex-col items-center justify-center bg-void px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold">
          <span className="font-sora text-lg font-bold text-[#0C0D13]">M</span>
        </span>
        <span className="font-sora text-2xl font-bold tracking-[-0.02em] text-ink-50">
          Meridian
        </span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
