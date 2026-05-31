import { writeFileSync } from "fs"
import { join } from "path"

// Builds a minimal, valid single-page PDF (no external deps) containing a
// freight invoice, so the demo has a real PDF to drop into the AI parser.
// All text is ASCII so byte offsets match string length for the xref table.

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

// [text, fontSize] — drawn top-to-bottom from y=770.
const LINES: Array<[string, number]> = [
  ["GULF CARGO LLC", 18],
  ["Freight Forwarding and Logistics - Dubai, United Arab Emirates", 10],
  ["", 6],
  ["INVOICE", 14],
  ["", 4],
  ["Invoice Number: GC-2099", 11],
  ["Invoice Date: 2026-05-15", 11],
  ["Due Date: 2026-07-14", 11],
  ["", 4],
  ["Bill To:", 11],
  ["Najm Distribution KSA", 11],
  ["Attn: Accounts Payable", 11],
  ["ap@najm-dist.example", 11],
  ["", 4],
  [
    "Description: Cross-border road freight, Dubai to Riyadh -",
    11,
  ],
  ["3 FTL shipments of consumer electronics.", 11],
  ["", 4],
  ["Line Items:", 11],
  ["FTL freight Dubai-Riyadh    Qty 3    Unit 5200.00    15600.00", 10],
  ["Customs documentation       Qty 1    Unit 900.00      900.00", 10],
  ["Cargo insurance             Qty 1    Unit 1500.00    1500.00", 10],
  ["", 4],
  ["Subtotal (USD): 18000.00", 11],
  ["Total Due (USD): 18000.00", 12],
]

function buildContentStream(): string {
  let out = "BT\n"
  let first = true
  for (const [text, size] of LINES) {
    const lead = Math.round(size * 1.5)
    out += `/F1 ${size} Tf\n`
    out += first ? `50 770 Td\n` : `0 -${lead} Td\n`
    first = false
    if (text) out += `(${esc(text)}) Tj\n`
  }
  out += "ET"
  return out
}

function buildPdf(): string {
  const content = buildContentStream()
  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
      "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    4: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    5: `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
  }

  let pdf = "%PDF-1.4\n"
  const offsets: number[] = []
  for (let i = 1; i <= 5; i++) {
    offsets[i] = Buffer.byteLength(pdf, "utf8")
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8")
  pdf += "xref\n0 6\n0000000000 65535 f \n"
  for (let i = 1; i <= 5; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  return pdf
}

const out = join(process.cwd(), "public", "sample-invoice.pdf")
writeFileSync(out, buildPdf(), "utf8")
console.log(`Wrote ${out}`)
