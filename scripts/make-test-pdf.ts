import { writeFileSync } from "fs"

// Builds a minimal but valid PDF with real invoice text so pdf-parse can extract it.
const objs: Record<number, string> = {
  1: "<</Type/Catalog/Pages 2 0 R>>",
  2: "<</Type/Pages/Kids[3 0 R]/Count 1>>",
  3: "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
  5: "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
}
const lines = [
  "Invoice Number: INV-9001",
  "Bill To: Najm Distribution KSA",
  "Email: ap@najm-dist.example",
  "Due Date: 2026-08-15",
  "Subtotal: $11,900.00",
  "Total Amount Due: $12,500.00",
]
let stream = "BT /F1 12 Tf 72 740 Td"
lines.forEach((l, i) => {
  stream += `${i === 0 ? "" : " 0 -18 Td"} (${l}) Tj`
})
stream += " ET"
objs[4] = `<</Length ${Buffer.byteLength(stream)}>>\nstream\n${stream}\nendstream`

let pdf = "%PDF-1.4\n"
const offsets: Record<number, number> = {}
for (let i = 1; i <= 5; i++) {
  offsets[i] = Buffer.byteLength(pdf)
  pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`
}
const xrefStart = Buffer.byteLength(pdf)
pdf += "xref\n0 6\n0000000000 65535 f \n"
for (let i = 1; i <= 5; i++) {
  pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n"
}
pdf += `trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`

writeFileSync(".playwright-mcp/test-invoice.pdf", pdf, "latin1")
console.log("wrote .playwright-mcp/test-invoice.pdf")
