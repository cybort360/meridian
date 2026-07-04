import * as Sentry from "@sentry/nextjs"

// Next.js throws control-flow "errors" to steer rendering - most notably the
// DynamicServerError (digest "DYNAMIC_SERVER_USAGE") raised during the build's
// static-generation probe when a route reads headers()/request.url. These are
// expected signals, not faults, so they shouldn't be logged or sent to Sentry.
function isFrameworkControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown })?.digest
  return typeof digest === "string" && digest.startsWith("DYNAMIC_SERVER_USAGE")
}

// Report a server-side error to Sentry (when SENTRY_DSN is configured) and
// always log it locally. `context` is attached as extra data - keep it to
// non-sensitive identifiers (route, ids), never secrets or raw PII.
export function captureError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (isFrameworkControlFlow(error)) return
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, context ? { extra: context } : undefined)
  }
  console.error("[API Error]", context?.route ?? "", error)
}
