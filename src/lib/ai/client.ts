import OpenAI from "openai"

// Alibaba Qwen is reached through DashScope's OpenAI-compatible endpoint, so we
// use the OpenAI SDK pointed at DashScope rather than a bespoke client.
// Docs: https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope

// Thrown when the Qwen key is missing/placeholder so callers can degrade
// gracefully (CLAUDE.md §7: never crash on AI failure).
export class AIConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AIConfigError"
  }
}

const PLACEHOLDER = "REPLACE_ME"

// International DashScope endpoint. Override with DASHSCOPE_BASE_URL to use the
// China-mainland endpoint (https://dashscope.aliyuncs.com/compatible-mode/v1).
const DEFAULT_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"

let client: OpenAI | null = null

export function isAIConfigured(): boolean {
  const key = process.env.DASHSCOPE_API_KEY
  return !!key && key !== PLACEHOLDER
}

export function getQwenClient(): OpenAI {
  if (client) return client
  if (!isAIConfigured()) {
    throw new AIConfigError(
      "Qwen is not configured. Set DASHSCOPE_API_KEY in .env.local."
    )
  }
  client = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY!,
    baseURL: process.env.DASHSCOPE_BASE_URL || DEFAULT_BASE_URL,
  })
  return client
}

// Most capable Qwen model; risk scoring is correctness-sensitive.
export const RISK_MODEL = "qwen-max"

// Invoice field extraction runs on already-extracted PDF text (not images), so
// a text model suffices here too.
export const PARSE_MODEL = "qwen-max"
