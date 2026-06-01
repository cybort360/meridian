"use client"

import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/hooks/useLanguage"

export function LanguageToggle() {
  const { lang, setLang } = useLanguage()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "en" ? "ar" : "en")}
      className="gap-1.5 text-slate-300 hover:text-slate-100"
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4" />
      {/* Show the language you can switch TO. */}
      {lang === "en" ? "العربية" : "English"}
    </Button>
  )
}
