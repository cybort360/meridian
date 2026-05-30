import Anthropic from "@anthropic-ai/sdk"

// Thrown when the Anthropic key is missing/placeholder so callers can degrade
// gracefully (CLAUDE.md §7: never crash on AI failure).
export class AIConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AIConfigError"
  }
}

const PLACEHOLDER = "REPLACE_ME"

let client: Anthropic | null = null

export function isAIConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY
  return !!key && key !== PLACEHOLDER
}

export function getAnthropicClient(): Anthropic {
  if (client) return client
  if (!isAIConfigured()) {
    throw new AIConfigError(
      "Anthropic is not configured. Set ANTHROPIC_API_KEY in .env.local."
    )
  }
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  return client
}

// Most capable model; risk scoring is correctness-sensitive.
export const RISK_MODEL = "claude-opus-4-8"
