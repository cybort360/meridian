// Fail-fast environment validation. Surfaces a clear error at startup when a
// required secret is missing, instead of a confusing failure mid-request.

const required = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "CIRCLE_API_KEY",
  "CIRCLE_ENTITY_SECRET",
  "CIRCLE_WALLET_SET_ID",
  "DASHSCOPE_API_KEY",
] as const

const PLACEHOLDER = "REPLACE_ME"

export function validateEnv(): void {
  // Skip during the build phase — secrets aren't (and needn't be) present then;
  // we validate at runtime so a misconfigured deploy crashes loudly on boot.
  if (process.env.NEXT_PHASE === "phase-production-build") return

  const missing = required.filter((key) => {
    const v = process.env[key]
    return !v || v === PLACEHOLDER
  })
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    )
  }
}
