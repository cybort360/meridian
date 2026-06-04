import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET /api/health — liveness + DB connectivity probe for uptime monitors and
// deploy checks. 200 when the database answers, 503 otherwise.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      db: "connected",
    })
  } catch {
    return NextResponse.json({ status: "error", db: "disconnected" }, { status: 503 })
  }
}
