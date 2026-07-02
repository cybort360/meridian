import { z } from "zod"
import { getQwenClient, isAIConfigured, PARSE_MODEL } from "./client"

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

// ─── Heuristic (no-AI) fallback ──────────────────────────────────────────────
// Best-effort regex extraction so PDF upload still auto-fills when Qwen
// isn't configured (or the AI call fails). Missing fields are left null for the
// user to complete.

function num(s: string): number | null {
  const n = parseFloat(s.replace(/,/g, ""))
  return Number.isFinite(n) ? n : null
}

function heuristicAmount(text: string): number | null {
  const lines = text.split(/\r?\n/)
  // "subtotal" deliberately excluded so it doesn't win over the real total.
  const priority =
    /(grand total|amount due|balance due|total due|amount payable|total amount|\btotal\b)/i
  const subtotal = /sub[-\s]?total/i
  const moneyRe = /([0-9][0-9,]*(?:\.[0-9]{1,2})?)/g
  // Take the largest amount across all total-style lines (handles subtotal < total).
  const totals: number[] = []
  for (const line of lines) {
    if (priority.test(line) && !subtotal.test(line)) {
      for (const m of line.matchAll(moneyRe)) {
        const n = num(m[1])
        if (n !== null && n > 0) totals.push(n)
      }
    }
  }
  if (totals.length) return Math.max(...totals)
  // Otherwise the largest currency-tagged or decimal amount in the document.
  const tagged = [
    ...text.matchAll(/(?:USD|US\$|\$|AED|د\.إ)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/g),
    ...text.matchAll(/([0-9][0-9,]*\.[0-9]{2})\b/g),
  ]
    .map((m) => num(m[1]))
    .filter((n): n is number => n !== null && n > 0)
  return tagged.length ? Math.max(...tagged) : null
}

function heuristicInvoiceNumber(text: string): string | null {
  const m = text.match(
    /invoice\s*(?:no\.?|number|num|#)?\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9/-]{1,})/i
  )
  if (m?.[1]) return m[1]
  const m2 = text.match(/\b(INV[-\s]?[A-Za-z0-9-]{2,})\b/i)
  return m2?.[1] ? m2[1].replace(/\s+/, "-") : null
}

function heuristicEmail(text: string): string | null {
  return (
    text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0] ?? null
  )
}

function heuristicDueDate(text: string): string | null {
  const dateRe =
    /(\d{4}-\d{2}-\d{2})|(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})|([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4})/
  const dueLine = text
    .split(/\r?\n/)
    .find((l) => /due\s*date|payment due|due/i.test(l))
  const src = dueLine ?? text
  const m = src.match(dateRe)
  return m ? normalizeDueDate(m[0]) : null
}

function heuristicBuyerName(text: string): string | null {
  const m =
    text.match(/bill\s*to\s*[:\n]\s*([^\n]+)/i) ??
    text.match(/(?:^|\n)\s*to\s*[:\n]\s*([^\n]+)/i)
  const name = m?.[1]?.trim()
  return name && name.length > 1 ? name.slice(0, 120) : null
}

export function heuristicParseInvoice(text: string): ParsedInvoice {
  return {
    invoiceNumber: heuristicInvoiceNumber(text),
    buyerName: heuristicBuyerName(text),
    buyerEmail: heuristicEmail(text),
    amountUSD: heuristicAmount(text),
    dueDate: heuristicDueDate(text),
    description: null,
    items: null,
  }
}

// Returns parsed fields. Uses Qwen when configured; otherwise (or if the AI
// call fails) falls back to a heuristic parse so PDF upload always works.
export async function parseInvoiceText(
  rawText: string
): Promise<ParsedInvoice | null> {
  if (!isAIConfigured()) {
    return heuristicParseInvoice(rawText)
  }

  try {
    const client = getQwenClient()
    const response = await client.chat.completions.create({
      model: PARSE_MODEL,
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(rawText) },
      ],
    })

    const content = response.choices[0]?.message?.content
    const json = content ? extractJson(content) : null
    if (!json) return heuristicParseInvoice(rawText)

    const candidate: unknown = JSON.parse(json)
    const result = parsedInvoiceSchema.safeParse(candidate)
    if (!result.success) {
      console.error("[invoiceParsing] invalid shape", result.error.issues)
      return heuristicParseInvoice(rawText)
    }

    return { ...result.data, dueDate: normalizeDueDate(result.data.dueDate) }
  } catch (error) {
    console.error("[invoiceParsing] AI parse failed, using heuristic", error)
    return heuristicParseInvoice(rawText)
  }
}
