"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import {
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Lock,
} from "lucide-react"
import { useProfile, type Profile } from "@/hooks/useProfile"
import { useWallet } from "@/hooks/useWallet"
import { LanguageToggle } from "@/components/shared/LanguageToggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorMessage } from "@/components/shared/ErrorMessage"
import {
  ARC_EXPLORER_URL,
  CIRCLE_BLOCKCHAIN,
} from "@/lib/constants"

const inputClass = "border-slate-700 bg-slate-800"

function Field({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="text-sm text-slate-200">{value}</div>
    </div>
  )
}

function ProfileSection({ profile }: { profile: Profile }) {
  const { save } = useProfile()
  const { update } = useSession()

  const [name, setName] = useState(profile.name)
  const [companyName, setCompanyName] = useState(profile.companyName ?? "")
  const [country, setCountry] = useState(profile.country)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Clear the "Saved" confirmation after a moment.
  useEffect(() => {
    if (!saved) return
    const id = setTimeout(() => setSaved(false), 2500)
    return () => clearTimeout(id)
  }, [saved])

  // Company name + country are part of the verified business identity and are
  // locked once KYB review starts (enforced server-side too). Only the display
  // name stays editable.
  const identityLocked =
    profile.kycStatus === "PENDING_REVIEW" || profile.kycStatus === "APPROVED"

  const dirty =
    name !== profile.name ||
    (!identityLocked &&
      (companyName !== (profile.companyName ?? "") ||
        country !== profile.country))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setSaving(true)
    const message = await save({ name, companyName, country })
    setSaving(false)
    if (message) {
      setError(message)
      return
    }
    setSaved(true)
    // Refresh the JWT-backed session so the TopBar reflects the new name.
    await update({ name })
  }

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <ErrorMessage message={error} />}

          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Layla Hassan"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="flex items-center gap-1.5">
                Company name
                {identityLocked && <Lock className="h-3 w-3 text-slate-500" />}
              </Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={inputClass}
                placeholder="Gulf Cargo LLC"
                disabled={identityLocked}
                readOnly={identityLocked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-1.5">
                Country
                {identityLocked && <Lock className="h-3 w-3 text-slate-500" />}
              </Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputClass}
                placeholder="UAE"
                disabled={identityLocked}
                readOnly={identityLocked}
              />
            </div>
          </div>

          {identityLocked && (
            <p className="flex items-start gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              Your company name and country are locked to your verified KYC
              record and can only change through re-verification.
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={saving || !dirty}
              className="bg-gold text-[#0C0D13] hover:bg-gold-bright"
            >
              {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function AccountSection({ profile }: { profile: Profile }) {
  const roleLabel =
    profile.role.charAt(0) + profile.role.slice(1).toLowerCase()

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <CardTitle className="text-base">Account</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field label="Email" value={profile.email} />
        <Field
          label="Account type"
          value={
            <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-400/20">
              {roleLabel}
            </span>
          }
        />
        <Field
          label="Member since"
          value={format(new Date(profile.createdAt), "MMM d, yyyy")}
        />
      </CardContent>
    </Card>
  )
}

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function NetworkSection() {
  const { wallet, loading, hasWallet } = useWallet()
  const [copied, setCopied] = useState(false)

  const environment =
    process.env.NEXT_PUBLIC_CIRCLE_ENVIRONMENT ?? "sandbox"

  async function copy() {
    if (!wallet?.address) return
    await navigator.clipboard.writeText(wallet.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <CardTitle className="text-base">Wallet &amp; Network</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Network" value={CIRCLE_BLOCKCHAIN} />
          <Field
            label="Circle environment"
            value={
              <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-300 ring-1 ring-slate-700">
                {environment}
              </span>
            }
          />
          <Field
            label="Wallet address"
            value={
              loading ? (
                <Skeleton className="h-5 w-32 bg-slate-800" />
              ) : wallet?.address ? (
                <div className="flex items-center gap-2">
                  <a
                    href={`${ARC_EXPLORER_URL}/address/${wallet.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-emerald-400 hover:underline"
                  >
                    {truncate(wallet.address)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    type="button"
                    onClick={copy}
                    aria-label="Copy address"
                    className="text-slate-400 hover:text-slate-100"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ) : (
                <span className="text-slate-500">
                  {hasWallet === false
                    ? "No wallet yet — create one on the Wallet page."
                    : "—"}
                </span>
              )
            }
          />
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <span>
            Circle API keys and the entity secret are stored server-side and are
            never exposed to the browser.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function PreferencesSection() {
  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <CardTitle className="text-base">Preferences</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-200">Language</p>
          <p className="text-xs text-slate-500">
            Switch between English and Arabic (with right-to-left layout).
          </p>
        </div>
        <LanguageToggle />
      </CardContent>
    </Card>
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-44 w-full bg-slate-900" />
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const { profile, loading, error } = useProfile()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your profile, account, and network preferences.
        </p>
      </div>

      {loading && <SettingsSkeleton />}

      {!loading && error && <ErrorMessage message={error} />}

      {!loading && profile && (
        <div className="space-y-6">
          <ProfileSection profile={profile} />
          <AccountSection profile={profile} />
          <NetworkSection />
          <PreferencesSection />
        </div>
      )}
    </div>
  )
}
