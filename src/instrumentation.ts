// Next.js instrumentation hook - runs once on server startup. Initialises
// Sentry only when SENTRY_DSN is set, so without a DSN the app carries zero
// monitoring overhead and makes no network calls.
export async function register() {
  if (!process.env.SENTRY_DSN) return
  const Sentry = await import("@sentry/nextjs")
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === "production",
  })
}
