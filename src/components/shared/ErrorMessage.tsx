import { AlertCircle } from "lucide-react"

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-400">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
