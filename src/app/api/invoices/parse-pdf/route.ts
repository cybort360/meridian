import { NextRequest, NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { extractPdfText } from "@/lib/utils/pdf"
import { parseInvoiceText } from "@/lib/ai/invoiceParsing"
import { AIConfigError } from "@/lib/ai/client"

// pdf-parse needs Node APIs — opt out of the Edge runtime.
export const runtime = "nodejs"

const MAX_BYTES = 10 * 1024 * 1024 // 10MB

// POST /api/invoices/parse-pdf — extract invoice fields from an uploaded PDF.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "SME") {
      return NextResponse.json(
        { error: "Only SME accounts can create invoices." },
        { status: 403 }
      )
    }

    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return NextResponse.json(
        { error: "Expected a PDF file upload." },
        { status: 400 }
      )
    }

    const file = form.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please attach a PDF file." },
        { status: 400 }
      )
    }

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      return NextResponse.json(
        { error: "Please upload a PDF file." },
        { status: 400 }
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "PDF is too large. Maximum size is 10MB." },
        { status: 413 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    let text: string
    try {
      text = await extractPdfText(buffer)
    } catch (error) {
      console.error("[API /invoices/parse-pdf] pdf read", error)
      return NextResponse.json(
        { error: "Could not read this PDF. Please try another file." },
        { status: 400 }
      )
    }

    if (!text) {
      return NextResponse.json(
        { error: "Could not parse invoice data from PDF" },
        { status: 400 }
      )
    }

    const parsed = await parseInvoiceText(text)
    if (!parsed) {
      return NextResponse.json(
        { error: "Could not parse invoice data from PDF" },
        { status: 400 }
      )
    }

    return NextResponse.json({ data: parsed }, { status: 200 })
  } catch (error) {
    if (error instanceof AIConfigError) {
      return NextResponse.json(
        {
          error:
            "AI parsing is not available right now. Please fill in the details manually.",
        },
        { status: 503 }
      )
    }
    captureError(error, { route: "API /invoices/parse-pdf POST" })
    return NextResponse.json(
      { error: "Could not parse the PDF. Please try again." },
      { status: 500 }
    )
  }
}
