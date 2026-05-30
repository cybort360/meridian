import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets"

// Thrown when Circle credentials are missing/placeholder so callers can
// surface a friendly "wallet features not configured yet" message instead
// of leaking a raw SDK error.
export class CircleConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CircleConfigError"
  }
}

const PLACEHOLDER = "REPLACE_ME"

let client: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null =
  null

function isMissing(value: string | undefined): boolean {
  return !value || value === PLACEHOLDER
}

export function isCircleConfigured(): boolean {
  return (
    !isMissing(process.env.CIRCLE_API_KEY) &&
    !isMissing(process.env.CIRCLE_ENTITY_SECRET)
  )
}

// Lazily initialize the developer-controlled wallets client. The SDK
// generates a fresh entity-secret ciphertext per request automatically.
export function getCircleClient() {
  if (client) return client

  if (!isCircleConfigured()) {
    throw new CircleConfigError(
      "Circle is not configured. Set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET in .env.local."
    )
  }

  client = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  })
  return client
}

export function getWalletSetId(): string {
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID
  if (isMissing(walletSetId)) {
    throw new CircleConfigError(
      "CIRCLE_WALLET_SET_ID is not set. Run `npm run circle:setup` to create a wallet set, then add the printed ID to .env.local."
    )
  }
  return walletSetId!
}
