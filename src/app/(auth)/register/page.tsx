"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { FormBanner } from "@/components/shared/FormBanner"
import { FieldError } from "@/components/shared/FieldError"
import { registerSchema } from "@/lib/utils/validation"
import { cn } from "@/lib/utils"

type Role = "SME" | "INVESTOR"
type FieldErrors = {
  name?: string
  companyName?: string
  email?: string
  password?: string
}

const inputBase = "bg-slate-800"
const errorBorder = "border-red-500"
const normalBorder = "border-slate-700"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("SME")

  const [errors, setErrors] = useState<FieldErrors>({})
  const [emailExists, setEmailExists] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const disabled = loading || success

  // Validate one field against its slice of the Zod schema.
  function fieldError(
    field: "name" | "companyName" | "email" | "password",
    value: string
  ): string | undefined {
    const res = registerSchema.shape[field].safeParse(value)
    return res.success ? undefined : res.error.issues[0]?.message
  }

  function handleBlur(field: "name" | "companyName" | "email" | "password") {
    const value = { name, companyName, email, password }[field]
    setErrors((prev) => ({ ...prev, [field]: fieldError(field, value) }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    setEmailExists(false)

    const parsed = registerSchema.safeParse({
      name,
      email,
      password,
      companyName,
      role,
    })
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors
      setErrors({
        name: fe.name?.[0],
        companyName: fe.companyName?.[0],
        email: fe.email?.[0],
        password: fe.password?.[0],
      })
      return
    }
    setErrors({})

    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      })

      if (!res.ok) {
        setLoading(false)
        if (res.status === 409) {
          setEmailExists(true)
          return
        }
        setServerError("Something went wrong. Please try again.")
        return
      }

      // Success — show the banner, sign in behind it, then redirect.
      setLoading(false)
      setSuccess(true)
      const signInRes = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      })
      setTimeout(() => {
        if (!signInRes || signInRes.error) {
          router.push("/login")
        } else {
          // New users see the one-time onboarding flywheel first.
          router.push("/onboarding")
          router.refresh()
        }
      }, 1500)
    } catch {
      setLoading(false)
      setServerError("Connection error. Check your internet and try again.")
    }
  }

  return (
    <Card className="dark border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription className="text-slate-400">
          Join Meridian as an SME or an investor.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="space-y-4">
          {success && (
            <FormBanner
              type="success"
              message="Account created! Setting up your wallet..."
            />
          )}
          {serverError && (
            <FormBanner
              type="error"
              message={serverError}
              onDismiss={() => setServerError(null)}
            />
          )}

          <div className="space-y-1">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              disabled={disabled}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }))
              }}
              onBlur={() => handleBlur("name")}
              className={cn(inputBase, errors.name ? errorBorder : normalBorder)}
              placeholder="Layla Hassan"
            />
            <FieldError message={errors.name} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              value={companyName}
              disabled={disabled}
              onChange={(e) => {
                setCompanyName(e.target.value)
                if (errors.companyName)
                  setErrors((p) => ({ ...p, companyName: undefined }))
              }}
              onBlur={() => handleBlur("companyName")}
              className={cn(
                inputBase,
                errors.companyName ? errorBorder : normalBorder
              )}
              placeholder="Gulf Trading LLC"
            />
            <FieldError message={errors.companyName} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              disabled={disabled}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
                if (emailExists) setEmailExists(false)
              }}
              onBlur={() => handleBlur("email")}
              className={cn(
                inputBase,
                errors.email || emailExists ? errorBorder : normalBorder
              )}
              placeholder="you@company.ae"
            />
            {emailExists ? (
              <p className="mt-1 text-xs text-red-400">
                An account with this email already exists.{" "}
                <Link href="/login" className="underline hover:text-red-300">
                  Log in instead?
                </Link>
              </p>
            ) : (
              <FieldError message={errors.email} />
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              disabled={disabled}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password)
                  setErrors((p) => ({ ...p, password: undefined }))
              }}
              onBlur={() => handleBlur("password")}
              className={cn(
                inputBase,
                errors.password ? errorBorder : normalBorder
              )}
              placeholder="At least 8 characters"
            />
            <FieldError message={errors.password} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="role">Account type</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as Role)}
              disabled={disabled}
            >
              <SelectTrigger id="role" className="border-slate-700 bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SME">SME — finance my invoices</SelectItem>
                <SelectItem value="INVESTOR">
                  Investor — fund invoices
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            disabled={disabled}
            className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Creating your account..." : "Create account"}
          </Button>
          <p className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-400 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
