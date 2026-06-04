import { NextRequest, NextResponse } from "next/server"
import { captureError } from "@/lib/observability"
import { getServerSession } from "next-auth"
import { readFile } from "fs/promises"
import path from "path"
import { authOptions } from "@/lib/auth"
import {
  KYC_DIR,
  KYC_EXT,
  extOf,
  isValidKey,
  keyBelongsTo,
} from "@/lib/kycStorage"

export const runtime = "nodejs"

// GET /api/kyc/document/[key] — streams a KYC document only to its owner or an
// admin reviewer. PII is never exposed via a static/public path.
export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const key = decodeURIComponent(params.key)
    // Strict allow-list pattern also blocks path traversal (no slashes/dots).
    if (!isValidKey(key)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 })
    }

    const isAdmin = session.user.role === "ADMIN"
    if (!isAdmin && !keyBelongsTo(key, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let bytes: Buffer
    try {
      bytes = await readFile(path.join(KYC_DIR, path.basename(key)))
    } catch {
      return NextResponse.json({ error: "Not found." }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": KYC_EXT[extOf(key)] ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${key}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    captureError(error, { route: "API /kyc/document GET" })
    return NextResponse.json(
      { error: "Could not load the document." },
      { status: 500 }
    )
  }
}
