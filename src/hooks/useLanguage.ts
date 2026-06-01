"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
import en from "@/messages/en.json"
import ar from "@/messages/ar.json"

export type Lang = "en" | "ar"

const STORAGE_KEY = "meridian.lang"
const messages: Record<Lang, Record<string, unknown>> = { en, ar }

// Module-level store so every component shares one language and re-renders on
// change without a context provider. SSR snapshot is always "en" to avoid a
// hydration mismatch; the persisted value is applied in an effect after mount.
let currentLang: Lang = "en"
let initialized = false
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function applyToDocument(lang: Lang) {
  if (typeof document === "undefined") return
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"
  document.documentElement.lang = lang
}

export function setLang(lang: Lang) {
  currentLang = lang
  if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, lang)
  applyToDocument(lang)
  emit()
}

function initFromStorage() {
  if (initialized || typeof window === "undefined") return
  initialized = true
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === "ar" || saved === "en") currentLang = saved
  applyToDocument(currentLang)
  emit()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

// Resolve a dot-notation key ("nav.dashboard") against a messages object.
function resolve(obj: Record<string, unknown>, key: string): string | null {
  let cur: unknown = obj
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as object)) {
      cur = (cur as Record<string, unknown>)[part]
    } else {
      return null
    }
  }
  return typeof cur === "string" ? cur : null
}

export function useLanguage() {
  const lang = useSyncExternalStore(
    subscribe,
    () => currentLang,
    () => "en" as Lang
  )

  useEffect(() => {
    initFromStorage()
  }, [])

  // Falls back to the English string, then the raw key, if a translation is missing.
  const t = useCallback(
    (key: string): string =>
      resolve(messages[lang], key) ?? resolve(messages.en, key) ?? key,
    [lang]
  )

  return { lang, setLang, t }
}
