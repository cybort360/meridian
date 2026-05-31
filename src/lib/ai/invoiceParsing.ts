import { z } from "zod"
import { getAnthropicClient, isAIConfigured, PARSE_MODEL } from "./client"

const parsedItemSchema = z.object({
  description: z.string().nullable(),
  quantity: z.number().nullable(),
  unitPrice: z.number().nullable(),
})

// Tolerate amounts the model returns as "$10,000.00" by stripping non-numerics.
const amountUSD = z.preprocess((v) => {
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.]/g, ""))
    return Number.isFinite(n) ? n : null
  }
  return v
}, z.number().nullable())

export const parsedInvoiceSchema = z.object({
  invoiceNumber: z.string().nullable(),
  buyerName: z.string().nullable(),
  buyerEmail: z.string().nullable(),
  amountUSD,
  dueDate: z.string().nullable(),
  description: z.string().nullable(),
  items: z.array(parsedItemSchema).nullable(),
})

export type ParsedInvoice = z.infer<typeof parsedInvoiceSchema>

const SYSTEM_PROMPT =
  "You extract structured invoice data from raw document text. " +
  "You respond with only a single JSON object and no other text."

function buildUserPrompt(text: string): string {
  return `Extract invoice details from this text and return ONLY a JSON object with these exact fields:
{ invoiceNumber, buyerName, buyerEmail, amountUSD (number), dueDate (ISO string YYYY-MM-DD), description, items (array of {description, quantity, unitPrice}) }
If a field cannot be found, use null. Raw text: ${text}`
}

// Reuse the tolerant JSON extraction approach from riskScoring.
function extractJson(text: string): string | null {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1 || end < start) return null
  return text.slice(start, end + 1)
}

// Normalize a model-supplied date to the YYYY-MM-DD a <input type="date"> expects.
function normalizeDueDate(value: string | null): string | null {
  if (!value) return null
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString().slice(0, 10)
}

// Returns parsed fields, or null when the model output can't be trusted.
// Throws AIConfigError (via getAnthropicClient) when AI isn't configured so the
// route can return a distinct 503.
export async function parseInvoiceText(
  rawText: string
): Promise<ParsedInvoice | null> {
  if (!isAIConfigured()) {
    // Surface a typed config error to the caller.
    getAnthropicClient()
  }

  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: PARSE_MODEL,
    max_tokens: 1024,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: buildUserPrompt(rawText) }],
  })

  const textBlock = response.content.find((b) => b.type === "text")
  if (!textBlock || textBlock.type !== "text") return null

  const json = extractJson(textBlock.text)
  if (!json) return null

  let candidate: unknown
  try {
    candidate = JSON.parse(json)
  } catch {
    return null
  }

  const result = parsedInvoiceSchema.safeParse(candidate)
  if (!result.success) {
    console.error("[invoiceParsing] invalid shape", result.error.issues)
    return null
  }

  return { ...result.data, dueDate: normalizeDueDate(result.data.dueDate) }
}
