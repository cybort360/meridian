import { extractText, getDocumentProxy } from "unpdf"

// Extract raw text from a PDF buffer. Uses unpdf, which bundles a
// serverless-safe build of pdf.js - unlike pdf-parse/pdfjs-dist, it does not
// reference browser globals (DOMMatrix) at load, so it runs in the Vercel Node
// runtime. Throws on unreadable PDFs; the caller turns that into a
// human-readable error.
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text } = await extractText(pdf, { mergePages: true })
  return text.trim()
}
