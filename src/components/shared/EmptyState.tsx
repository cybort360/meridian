import type { LucideIcon } from "lucide-react"

interface Props {
  icon?: LucideIcon
  title: string
  description?: string
  children?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, children }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 px-6 py-12 text-center">
      {Icon && (
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="text-sm font-medium text-slate-200">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
