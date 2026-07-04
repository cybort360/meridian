import { NextRequest, NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Rate limiting is backed by Upstash Redis. When the credentials aren't set
// (local dev, or before you provision Upstash), the limiters are disabled and
// every request is allowed - the app stays fully functional, it just isn't
// throttled. Configure UPSTASH_REDIS_REST_URL / _TOKEN to turn it on.
const configured =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

const redis = configured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

function makeLimiter(
  limiter: ReturnType<typeof Ratelimit.slidingWindow>,
  prefix: string
): Ratelimit | null {
  return redis ? new Ratelimit({ redis, limiter, prefix }) : null
}

export const authLimiter = makeLimiter(
  Ratelimit.slidingWindow(5, "15 m"),
  "meridian:auth"
)
export const paymentLimiter = makeLimiter(
  Ratelimit.slidingWindow(10, "1 h"),
  "meridian:payment"
)
export const apiLimiter = makeLimiter(
  Ratelimit.slidingWindow(100, "1 m"),
  "meridian:api"
)

export function clientIp(req: Request): string {
  // On Vercel, x-vercel-forwarded-for is set by the platform and cannot be
  // spoofed by the client - use it first.
  const vercelIp = req.headers.get("x-vercel-forwarded-for")
  if (vercelIp) return vercelIp.split(",")[0].trim()

  // Fallback for local dev and other platforms. Use the RIGHTMOST entry - the
  // last hop appended by a trusted proxy - rather than the leftmost, which is
  // attacker-controlled in most configurations.
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",").at(-1)!.trim()

  return "127.0.0.1"
}

// Enforce a limiter for the request's IP. Returns a 429 NextResponse when the
// limit is exceeded, or null to continue. No-ops (returns null) when Upstash
// isn't configured. Fails open on a limiter error so a Redis blip never blocks
// legitimate traffic.
export async function enforceRateLimit(
  req: NextRequest,
  limiter: Ratelimit | null
): Promise<NextResponse | null> {
  if (!limiter) return null
  try {
    const { success } = await limiter.limit(clientIp(req))
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        { status: 429 }
      )
    }
  } catch {
    return null
  }
  return null
}
