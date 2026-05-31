import { PDFParse } from "pdf-parse"

// Extract raw text from a PDF buffer. Wraps pdf-parse so route/business code
// never touches the parsing library directly. Throws on unreadable PDFs; the
// caller is responsible for turning that into a human-readable error.
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    return result.text.trim()
  } finally {
    await parser.destroy()
  }
}
