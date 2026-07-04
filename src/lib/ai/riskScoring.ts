import { z } from "zod"
import { getQwenClient, isAIConfigured, RISK_MODEL } from "./client"

export interface RiskScoringInput {
  invoiceAmount: number // In USD (human-readable)
  dueDate: Date
  buyerName: string
  buyerEmail: string
  smeCompanyName: string
  smeTransactionHistory: {
    totalInvoices: number
    settledOnTime: number
    defaulted: number
    avgDaysToSettle: number
  }
  description: string
}

export const riskAssessmentSchema = z.object({
  riskScore: z.number().int().min(0).max(100),
  riskLabel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  advanceRate: z.number().int().min(50).max(90),
  summary: z.string().min(1),
  flags: z.array(z.string()),
})

export type RiskAssessment = z.infer<typeof riskAssessmentSchema>

// Neutral fallback used whenever AI scoring is unavailable or returns
// something we can't trust. Never throws - the invoice still gets a score.
const DEFAULT_ASSESSMENT: RiskAssessment = {
  riskScore: 50,
  riskLabel: "MEDIUM",
  advanceRate: 70,
  summary:
    "AI scoring was unavailable, so a neutral medium-risk assessment was applied. Review manually before funding.",
  flags: ["AI_SCORING_UNAVAILABLE"],
}

const SYSTEM_PROMPT =
  "You are a trade finance risk analyst assessing invoices for financing risk. " +
  "You weigh buyer creditworthiness, time to maturity, and the SME's repayment track record. " +
  "You respond with only a single JSON object and no other text."

function daysUntil(date: Date): number {
  return Math.round((date.getTime() - Date.now()) / 86_400_000)
}

function buildUserPrompt(input: RiskScoringInput): string {
  const { smeTransactionHistory: h } = input
  return `Assess this invoice for financing risk.

Invoice Details:
- Amount: $${input.invoiceAmount} USD
- Buyer: ${input.buyerName} (${input.buyerEmail})
- SME: ${input.smeCompanyName}
- Due in: ${daysUntil(input.dueDate)} days
- SME track record: ${h.settledOnTime} of ${h.totalInvoices} invoices settled on time, ${h.defaulted} defaults, avg ${h.avgDaysToSettle} days to settle
- Description: ${input.description || "(none provided)"}

Return a JSON object with exactly these fields:
{
  "riskScore": <integer 0-100, higher is riskier>,
  "riskLabel": <"LOW" | "MEDIUM" | "HIGH">,
  "advanceRate": <integer 50-90, percentage of the invoice to advance>,
  "summary": <2-3 sentence plain English explanation>,
  "flags": <array of strings, risk factors identified>
}

Respond with ONLY the JSON object. No other text.`
}

// Extract the first balanced-looking JSON object from a string, tolerating any
// stray preamble the model might include.
function extractJson(text: string): string | null {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1 || end < start) return null
  return text.slice(start, end + 1)
}

export async function scoreInvoiceRisk(
  input: RiskScoringInput
): Promise<RiskAssessment> {
  if (!isAIConfigured()) return DEFAULT_ASSESSMENT

  try {
    const client = getQwenClient()
    const response = await client.chat.completions.create({
      model: RISK_MODEL,
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) return DEFAULT_ASSESSMENT

    const json = extractJson(content)
    if (!json) return DEFAULT_ASSESSMENT

    const parsed = riskAssessmentSchema.safeParse(JSON.parse(json))
    if (!parsed.success) {
      console.error("[riskScoring] invalid assessment", parsed.error.issues)
      return DEFAULT_ASSESSMENT
    }

    return parsed.data
  } catch (error) {
    console.error("[riskScoring]", error)
    return DEFAULT_ASSESSMENT
  }
}
