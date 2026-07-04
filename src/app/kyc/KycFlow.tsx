"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  X,
  Loader2,
  Clock,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldError } from "@/components/shared/FieldError"
import { FormBanner } from "@/components/shared/FormBanner"
import { kycSubmissionSchema } from "@/lib/utils/validation"
import { cn } from "@/lib/utils"

type KycStatus = "NOT_SUBMITTED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED"

const INDUSTRIES = [
  "Logistics & Freight",
  "Retail & Trading",
  "Construction",
  "Technology",
  "Healthcare",
  "Manufacturing",
  "Other",
]
const CITIES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Other UAE", "Outside UAE"]
const STEP_LABELS = ["Business Info", "Documents", "Review"]
const IS_DEMO = process.env.NEXT_PUBLIC_APP_ENV === "demo"

const inputBase = "bg-slate-800"
const errBorder = "border-red-500"
const okBorder = "border-slate-700"

interface BizForm {
  legalBusinessName: string
  tradeLicenseNumber: string
  commercialRegNumber: string
  industry: string
  phoneNumber: string
  websiteUrl: string
  businessAddress: string
  city: string
}

const STEP1_FIELDS = [
  "legalBusinessName",
  "tradeLicenseNumber",
  "commercialRegNumber",
  "businessAddress",
  "city",
  "industry",
  "phoneNumber",
  "websiteUrl",
  "country",
] as const

// ─── Document upload zone ──────────────────────────────────────────────────
interface DocState {
  url: string
  name: string
  size: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function UploadZone({
  title,
  helper,
  fieldName,
  required,
  doc,
  onUploaded,
  onRemove,
}: {
  title: string
  helper: string
  fieldName: string
  required?: boolean
  doc: DocState | null
  onUploaded: (d: DocState) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      const okType =
        file.type === "application/pdf" ||
        file.type === "image/jpeg" ||
        file.type === "image/png" ||
        /\.(pdf|jpe?g|png)$/i.test(file.name)
      if (!okType) {
        setError("Only PDF, JPG, or PNG files are accepted.")
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("File is too large. Maximum size is 5MB.")
        return
      }
      setUploading(true)
      try {
        const body = new FormData()
        body.append("file", file)
        body.append("fieldName", fieldName)
        const res = await fetch("/api/kyc/upload", { method: "POST", body })
        const json = await res.json()
        if (!res.ok) {
          setError(json.error ?? "Upload failed. Please try again.")
          return
        }
        onUploaded({ url: json.data.url, name: file.name, size: file.size })
      } catch {
        setError("Upload failed. Please try again.")
      } finally {
        setUploading(false)
      }
    },
    [fieldName, onUploaded]
  )

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-slate-200">{title}</span>
        {required && <span className="text-xs text-red-400">*</span>}
        {!required && <span className="text-xs text-slate-500">(optional)</span>}
      </div>

      {doc ? (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-slate-100">{doc.name}</p>
            <p className="text-xs text-slate-500">{formatBytes(doc.size)}</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove file"
            className="shrink-0 text-slate-400 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !uploading) {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            const f = e.dataTransfer.files?.[0]
            if (f) handleFile(f)
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
            drag
              ? "border-emerald-400 bg-emerald-400/5"
              : "border-slate-700 hover:border-slate-600",
            uploading && "pointer-events-none opacity-80"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ""
            }}
          />
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
              <p className="text-sm text-slate-300">Uploading...</p>
            </>
          ) : (
            <>
              <UploadCloud className="h-5 w-5 text-slate-400" />
              <p className="text-sm font-medium text-slate-200">
                Drop file here or click to upload
              </p>
            </>
          )}
        </div>
      )}

      <p className="flex items-center gap-1 text-xs text-slate-500">
        <FileText className="h-3 w-3" />
        {helper} · PDF, JPG, PNG (max 5MB)
      </p>
      {error && <FieldError message={error} />}
    </div>
  )
}

// ─── Main flow ───────────────────────────────────────────────────────────────
export function KycFlow({ initialStatus }: { initialStatus: KycStatus }) {
  const router = useRouter()
  const startPending =
    initialStatus === "PENDING_REVIEW" || initialStatus === "APPROVED"

  const [view, setView] = useState<"form" | "pending" | "approved">(
    initialStatus === "APPROVED"
      ? "approved"
      : startPending
        ? "pending"
        : "form"
  )
  const [step, setStep] = useState(1)
  const [biz, setBiz] = useState<BizForm>({
    legalBusinessName: "",
    tradeLicenseNumber: "",
    commercialRegNumber: "",
    industry: "",
    phoneNumber: "",
    websiteUrl: "",
    businessAddress: "",
    city: "",
  })
  const [errors, setErrors] = useState<Partial<Record<keyof BizForm, string>>>({})
  const [tradeLicenseDoc, setTradeLicenseDoc] = useState<DocState | null>(null)
  const [ownerIdDoc, setOwnerIdDoc] = useState<DocState | null>(null)
  const [proofDoc, setProofDoc] = useState<DocState | null>(null)
  const [docError, setDocError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function setField<K extends keyof BizForm>(key: K, value: string) {
    setBiz((p) => ({ ...p, [key]: value }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }))
  }

  function validateStep1(): boolean {
    const step1Schema = kycSubmissionSchema.pick(
      Object.fromEntries(STEP1_FIELDS.map((f) => [f, true])) as Record<
        (typeof STEP1_FIELDS)[number],
        true
      >
    )
    const parsed = step1Schema.safeParse({ ...biz, country: "UAE" })
    if (parsed.success) {
      setErrors({})
      return true
    }
    const fe = parsed.error.flatten().fieldErrors
    const next: Partial<Record<keyof BizForm, string>> = {}
    for (const k of Object.keys(biz) as (keyof BizForm)[]) {
      const msg = (fe as Record<string, string[] | undefined>)[k]?.[0]
      if (msg) next[k] = msg
    }
    setErrors(next)
    return false
  }

  function next() {
    if (step === 1) {
      if (!validateStep1()) return
      setStep(2)
    } else if (step === 2) {
      if (!tradeLicenseDoc || !ownerIdDoc) {
        setDocError("Please upload both required documents to continue.")
        return
      }
      setDocError(null)
      setStep(3)
    }
  }

  async function submit() {
    setSubmitError(null)
    if (!tradeLicenseDoc || !ownerIdDoc) {
      setStep(2)
      setDocError("Please upload both required documents to continue.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...biz,
          country: "UAE",
          websiteUrl: biz.websiteUrl || undefined,
          tradeLicenseDocUrl: tradeLicenseDoc.url,
          ownerIdDocUrl: ownerIdDoc.url,
          proofOfAddressUrl: proofDoc?.url,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSubmitError(json.error ?? "Could not submit. Please try again.")
        return
      }
      setView("pending")
    } catch {
      setSubmitError("Connection error. Check your internet and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // Poll status while pending; flip to approved + redirect when verified.
  useEffect(() => {
    if (view !== "pending") return
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/kyc/status")
        const json = await res.json()
        if (json.data?.kycStatus === "APPROVED") {
          clearInterval(id)
          setView("approved")
        }
      } catch {
        // keep polling
      }
    }, 3000)
    return () => clearInterval(id)
  }, [view])

  useEffect(() => {
    if (view !== "approved") return
    const t = setTimeout(() => {
      router.push("/dashboard")
      router.refresh()
    }, 2000)
    return () => clearTimeout(t)
  }, [view, router])

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-950 px-6 py-10 text-slate-100">
      <div className="flex w-full max-w-2xl items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold">
          <span className="font-sora text-base font-bold text-[#0C0D13]">M</span>
        </span>
        <span className="font-sora text-xl font-bold tracking-tight">Meridian</span>
        <span className="ml-2 rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
          Business Verification
        </span>
      </div>

      <div className="mt-10 w-full max-w-2xl">
        {view === "form" && (
          <>
            <p className="text-sm font-medium text-emerald-400">
              Step {step} of 3 · {STEP_LABELS[step - 1]}
            </p>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-1 flex-1 rounded-full",
                    s <= step ? "bg-emerald-400" : "bg-slate-800"
                  )}
                />
              ))}
            </div>

            {/* STEP 1 */}
            {step === 1 && (
              <div className="mt-8 space-y-4">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Business information
                </h1>
                <div className="space-y-1">
                  <Label htmlFor="legalBusinessName">Legal business name *</Label>
                  <Input
                    id="legalBusinessName"
                    value={biz.legalBusinessName}
                    onChange={(e) => setField("legalBusinessName", e.target.value)}
                    className={cn(inputBase, errors.legalBusinessName ? errBorder : okBorder)}
                    placeholder="Gulf Cargo LLC"
                  />
                  <FieldError message={errors.legalBusinessName} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="tradeLicenseNumber">UAE Trade License Number *</Label>
                    <Input
                      id="tradeLicenseNumber"
                      value={biz.tradeLicenseNumber}
                      onChange={(e) => setField("tradeLicenseNumber", e.target.value)}
                      className={cn(inputBase, errors.tradeLicenseNumber ? errBorder : okBorder)}
                      placeholder="e.g. 123456-UAE-2023"
                    />
                    <FieldError message={errors.tradeLicenseNumber} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="commercialRegNumber">Commercial Registration Number *</Label>
                    <Input
                      id="commercialRegNumber"
                      value={biz.commercialRegNumber}
                      onChange={(e) => setField("commercialRegNumber", e.target.value)}
                      className={cn(inputBase, errors.commercialRegNumber ? errBorder : okBorder)}
                      placeholder="CN-1234567"
                    />
                    <FieldError message={errors.commercialRegNumber} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="industry">Industry *</Label>
                    <Select
                      value={biz.industry}
                      onValueChange={(v) => setField("industry", v)}
                    >
                      <SelectTrigger
                        id="industry"
                        className={cn(inputBase, errors.industry ? errBorder : okBorder)}
                      >
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((i) => (
                          <SelectItem key={i} value={i}>
                            {i}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={errors.industry} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phoneNumber">Business Phone *</Label>
                    <Input
                      id="phoneNumber"
                      value={biz.phoneNumber}
                      onChange={(e) => setField("phoneNumber", e.target.value)}
                      className={cn(inputBase, errors.phoneNumber ? errBorder : okBorder)}
                      placeholder="+971 4 123 4567"
                    />
                    <FieldError message={errors.phoneNumber} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="websiteUrl">Website (optional)</Label>
                  <Input
                    id="websiteUrl"
                    value={biz.websiteUrl}
                    onChange={(e) => setField("websiteUrl", e.target.value)}
                    className={cn(inputBase, errors.websiteUrl ? errBorder : okBorder)}
                    placeholder="https://yourcompany.ae"
                  />
                  <FieldError message={errors.websiteUrl} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="businessAddress">Business Address *</Label>
                  <Input
                    id="businessAddress"
                    value={biz.businessAddress}
                    onChange={(e) => setField("businessAddress", e.target.value)}
                    className={cn(inputBase, errors.businessAddress ? errBorder : okBorder)}
                    placeholder="Office 1203, Business Bay"
                  />
                  <FieldError message={errors.businessAddress} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="city">City *</Label>
                  <Select value={biz.city} onValueChange={(v) => setField("city", v)}>
                    <SelectTrigger
                      id="city"
                      className={cn(inputBase, errors.city ? errBorder : okBorder)}
                    >
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.city} />
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="mt-8 space-y-6">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Upload documents
                </h1>
                <UploadZone
                  title="UAE Trade License"
                  helper="Your current trade license issued by DED or relevant authority"
                  fieldName="tradeLicense"
                  required
                  doc={tradeLicenseDoc}
                  onUploaded={(d) => {
                    setTradeLicenseDoc(d)
                    setDocError(null)
                  }}
                  onRemove={() => setTradeLicenseDoc(null)}
                />
                <UploadZone
                  title="Owner ID / Passport"
                  helper="Passport or Emirates ID of the business owner or authorized signatory"
                  fieldName="ownerId"
                  required
                  doc={ownerIdDoc}
                  onUploaded={(d) => {
                    setOwnerIdDoc(d)
                    setDocError(null)
                  }}
                  onRemove={() => setOwnerIdDoc(null)}
                />
                <UploadZone
                  title="Proof of Address"
                  helper="Utility bill or bank statement dated within 3 months"
                  fieldName="proofOfAddress"
                  doc={proofDoc}
                  onUploaded={(d) => setProofDoc(d)}
                  onRemove={() => setProofDoc(null)}
                />
                {docError && <FieldError message={docError} />}
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="mt-8 space-y-6">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Review &amp; submit
                </h1>
                {submitError && (
                  <FormBanner
                    type="error"
                    message={submitError}
                    onDismiss={() => setSubmitError(null)}
                  />
                )}
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2">
                  {[
                    ["Legal business name", biz.legalBusinessName],
                    ["Trade license #", biz.tradeLicenseNumber],
                    ["Commercial reg #", biz.commercialRegNumber],
                    ["Industry", biz.industry],
                    ["Phone", biz.phoneNumber],
                    ["Website", biz.websiteUrl || "-"],
                    ["Address", biz.businessAddress],
                    ["City", biz.city],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">
                        {label}
                      </dt>
                      <dd className="text-sm text-slate-100">{value}</dd>
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">
                      Documents
                    </dt>
                    <dd className="text-sm text-slate-100">
                      {tradeLicenseDoc?.name} · {ownerIdDoc?.name}
                      {proofDoc ? ` · ${proofDoc.name}` : ""}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs leading-relaxed text-slate-500">
                  By submitting, you confirm that all information provided is
                  accurate and you are authorized to represent this business.
                  Meridian uses this information solely for investor protection
                  and compliance purposes.
                </p>
              </div>
            )}

            {/* Nav */}
            <div className="mt-8 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={step === 1 || submitting}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
              >
                Back
              </Button>
              {step < 3 ? (
                <Button
                  type="button"
                  onClick={next}
                  className="bg-gold text-[#0C0D13] hover:bg-gold-bright"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="bg-gold text-[#0C0D13] hover:bg-gold-bright"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit for Verification
                </Button>
              )}
            </div>
          </>
        )}

        {/* PENDING */}
        {view === "pending" && (
          <div className="flex flex-col items-center pt-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 ring-1 ring-blue-400/30">
              <Clock className="h-8 w-8 text-blue-300" />
            </span>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight">
              Verification Submitted
            </h1>
            <p className="mt-2 max-w-md text-slate-400">
              We&apos;re reviewing your business details. This usually takes
              24-48 hours.
            </p>
            {IS_DEMO && (
              <p className="mt-3 max-w-md text-sm text-emerald-400">
                In demo mode, your account will be approved automatically in a
                few seconds.
              </p>
            )}
            <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking status…
            </div>
          </div>
        )}

        {/* APPROVED */}
        {view === "approved" && (
          <div className="flex flex-col items-center pt-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10 ring-1 ring-emerald-400/30">
              <ShieldCheck className="h-8 w-8 text-emerald-400" />
            </span>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-emerald-400">
              ✓ Business Verified
            </h1>
            <p className="mt-2 text-slate-400">Taking you to your dashboard…</p>
          </div>
        )}
      </div>
    </div>
  )
}
