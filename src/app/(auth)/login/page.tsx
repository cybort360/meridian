"use client"

import { useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, CheckCircle2 } from "lucide-react"
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
import { FormBanner } from "@/components/shared/FormBanner"
import { FieldError } from "@/components/shared/FieldError"
import { loginSchema } from "@/lib/utils/validation"
import { cn } from "@/lib/utils"

type FieldErrors = { email?: string; password?: string }

const inputBase = "bg-slate-800"
const errorBorder = "border-red-500"
const normalBorder = "border-slate-700"
const CREDENTIALS_ERROR = "Incorrect email or password. Please try again."
const RATE_LIMIT_ERROR =
  "Too many login attempts. Please wait 15 minutes before trying again."

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const disabled = loading || success

  // Surface NextAuth redirect errors (?error=...) without a resubmit.
  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error")
    if (error === "CredentialsSignin") setBanner(CREDENTIALS_ERROR)
    else if (error === "TooManyRequests") setBanner(RATE_LIMIT_ERROR)
  }, [])

  function fieldError(field: "email" | "password", value: string): string | undefined {
    const res = loginSchema.shape[field].safeParse(value)
    return res.success ? undefined : res.error.issues[0]?.message
  }

  function handleBlur(field: "email" | "password") {
    const value = { email, password }[field]
    setErrors((prev) => ({ ...prev, [field]: fieldError(field, value) }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBanner(null)

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors
      setErrors({ email: fe.email?.[0], password: fe.password?.[0] })
      return
    }
    setErrors({})

    setLoading(true)
    try {
      const res = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      })

      // Rate limited: authorize() throws Error("TooManyRequests"), which
      // NextAuth surfaces as res.error. Check it before the generic credentials
      // path so a throttled attempt shows the wait message, not "wrong password".
      if (res?.error === "TooManyRequests") {
        setLoading(false)
        setBanner(RATE_LIMIT_ERROR)
        return
      }

      if (!res || res.error) {
        setLoading(false)
        // Don't reveal whether the email or the password was wrong.
        setBanner(
          res?.error === "CredentialsSignin"
            ? CREDENTIALS_ERROR
            : "Sign in failed. Please try again."
        )
        return
      }

      // Success - hold a brief confirmation state before redirecting.
      setLoading(false)
      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 800)
    } catch {
      setLoading(false)
      setBanner("Connection error. Check your internet and try again.")
    }
  }

  return (
    <Card className="dark border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription className="text-slate-400">
          Sign in to your Meridian account.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="space-y-4">
          {banner && (
            <FormBanner
              type="error"
              message={banner}
              onDismiss={() => setBanner(null)}
            />
          )}

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
              }}
              onBlur={() => handleBlur("email")}
              className={cn(inputBase, errors.email ? errorBorder : normalBorder)}
              placeholder="you@company.ae"
            />
            <FieldError message={errors.email} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
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
              placeholder="••••••••"
            />
            <FieldError message={errors.password} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            disabled={disabled}
            className={cn(
              "w-full text-slate-950",
              success
                ? "bg-emerald-600 hover:bg-emerald-600"
                : "bg-gold hover:bg-gold-bright"
            )}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {success && <CheckCircle2 className="mr-2 h-4 w-4" />}
            {success
              ? "Logged in - loading your dashboard"
              : loading
                ? "Signing in..."
                : "Sign in"}
          </Button>
          <p className="text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-emerald-400 hover:underline">
              Create one
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
