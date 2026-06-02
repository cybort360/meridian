import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { authOptions } from "@/lib/auth"

// Writing to /public needs Node APIs.
export const runtime = "nodejs"

const MAX_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
}
const ALLOWED_FIELDS = ["tradeLicense", "ownerId", "proofOfAddress"]

// POST /api/kyc/upload — stores a single KYC document and returns its URL.
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
    if (!ALLOWED_FIELDS.includes(fieldName)) {
      return NextResponse.json(
        { error: "Unknown document type." },
        { status: 400 }
      )
    }

    const ext =
      ALLOWED[file.type] ??
      (file.name.toLowerCase().match(/\.(pdf|jpg|jpeg|png)$/)?.[1] === "jpeg"
        ? "jpg"
        : file.name.toLowerCase().match(/\.(pdf|jpg|jpeg|png)$/)?.[1])
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

    const dir = path.join(process.cwd(), "public", "uploads", "kyc")
    await mkdir(dir, { recursive: true })
    const filename = `${session.user.id}-${fieldName}-${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(dir, filename), buffer)

    return NextResponse.json({ data: { url: `/uploads/kyc/${filename}` } })
  } catch (error) {
    console.error("[API /kyc/upload POST]", error)
    return NextResponse.json(
      { error: "Could not upload the file. Please try again." },
      { status: 500 }
    )
  }
}
