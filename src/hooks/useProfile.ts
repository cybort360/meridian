"use client"

import { useCallback, useEffect, useState } from "react"
import type { UserRole, KycStatus } from "@prisma/client"

export interface Profile {
  id: string
  name: string
  email: string
  role: UserRole
  companyName: string | null
  country: string
  kycStatus: KycStatus
  createdAt: string
}

export interface ProfileUpdate {
  name: string
  companyName: string
  country: string
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/profile")
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Could not load your profile.")
        return
      }
      setProfile(json.data as Profile)
    } catch {
      setError("Could not load your profile.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Returns an error message on failure, or null on success.
  const save = useCallback(async (update: ProfileUpdate): Promise<string | null> => {
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      })
      const json = await res.json()
      if (!res.ok) {
        return json.error ?? "Could not save your changes."
      }
      setProfile(json.data as Profile)
      return null
    } catch {
      return "Could not save your changes."
    }
  }, [])

  return { profile, loading, error, save, refetch: load }
}
