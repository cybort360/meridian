import { NextRequest, NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { getServerSession } from "next-auth"
import { writeFile, mkdir } from "fs/promises"
import { randomBytes } from "crypto"
import path from "path"
import { authOptions } from "@/lib/auth"
import { KYC_DIR, KYC_FIELDS, urlForKey } from "@/lib/kycStorage"

// Writing files needs Node APIs.
export const runtime = "nodejs"

const MAX_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
}

// POST /api/kyc/upload - stores a single KYC document privately and returns an
// authenticated URL. Documents are never written under /public.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return NextResponse.json(
        { error: "Expected a file upload." },
        { status: 400 }
      )
    }

    const file = form.get("file")
    const fieldName = String(form.get("fieldName") ?? "")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please attach a file." }, { status: 400 })
    }
    if (!(KYC_FIELDS as readonly string[]).includes(fieldName)) {
      return NextResponse.json({ error: "Unknown document type." }, { status: 400 })
    }

    const nameExt = file.name.toLowerCase().match(/\.(pdf|jpe?g|png)$/)?.[1]
    const ext = ALLOWED[file.type] ?? (nameExt === "jpeg" ? "jpg" : nameExt)
    if (!ext) {
      return NextResponse.json(
        { error: "Only PDF, JPG, or PNG files are accepted." },
        { status: 400 }
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 5MB." },
        { status: 413 }
      )
    }

    await mkdir(KYC_DIR, { recursive: true })
    // CSPRNG suffix so the storage key (and thus the URL) is unguessable.
    const storageKey = `${session.user.id}-${fieldName}-${randomBytes(16).toString("hex")}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(KYC_DIR, storageKey), buffer)

    return NextResponse.json({ data: { url: urlForKey(storageKey) } })
  } catch (error) {
    captureError(error, { route: "API /kyc/upload POST" })
    return NextResponse.json(
      { error: "Could not upload the file. Please try again." },
      { status: 500 }
    )
  }
}
