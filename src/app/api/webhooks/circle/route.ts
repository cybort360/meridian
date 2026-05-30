import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { toPaymentStatus } from "@/lib/circle/payments"
import type { CircleTransactionState } from "@/types/circle"

/**
 * Circle webhook receiver.
 *
 * Circle signs each notification with ECDSA: the signature is in the
 * `X-Circle-Signature` header and the signing public key id in
 * `X-Circle-Key-Id`. (CLAUDE.md §6.4 references an HMAC secret, but Circle's
 * actual mechanism is ECDSA public-key signing — we verify that way.)
 *
 * Register this endpoint's public HTTPS URL under Webhooks in the Circle
 * console. Always returns 200 quickly so Circle doesn't retry.
 */

const publicKeyCache = new Map<string, string>()

async function fetchPublicKey(keyId: string): Promise<string | null> {
  const cached = publicKeyCache.get(keyId)
  if (cached) return cached

  const apiKey = process.env.CIRCLE_API_KEY
  if (!apiKey || apiKey === "REPLACE_ME") return null

  const res = await fetch(
    `https://api.circle.com/v2/notifications/publicKey/${keyId}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  )
  if (!res.ok) return null

  const json = await res.json()
  const publicKey: string | undefined = json?.data?.publicKey
  if (publicKey) publicKeyCache.set(keyId, publicKey)
  return publicKey ?? null
}

async function verifySignature(
  rawBody: string,
  signature: string | null,
  keyId: string | null
): Promise<boolean> {
  if (!signature || !keyId) return false
  const publicKey = await fetchPublicKey(keyId)
  if (!publicKey) return false

  try {
    const keyPem = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`
    const verifier = crypto.createVerify("SHA256")
    verifier.update(rawBody)
    verifier.end()
    return verifier.verify(keyPem, Buffer.from(signature, "base64"))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get("X-Circle-Signature")
  const keyId = req.headers.get("X-Circle-Key-Id")

  const verified = await verifySignature(rawBody, signature, keyId)
  if (!verified) {
    // In production an unverified webhook is rejected. In development we log
    // and continue so local testing (e.g. via a tunnel without real keys)
    // isn't blocked.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
    console.warn("[webhook/circle] signature not verified (allowed in dev)")
  }

  try {
    const body = JSON.parse(rawBody)
    // Circle nests the resource under `notification`; transactions carry id + state.
    const tx = body?.notification?.transaction ?? body?.notification ?? body
    const circlePaymentId: string | undefined = tx?.id
    const state: CircleTransactionState | undefined = tx?.state

    if (circlePaymentId && state) {
      const payment = await prisma.payment.findUnique({
        where: { circlePaymentId },
      })
      if (payment) {
        await prisma.payment.update({
          where: { circlePaymentId },
          data: {
            status: toPaymentStatus(state),
            txHash: tx?.txHash ?? payment.txHash,
          },
        })
      }
    }
  } catch (error) {
    // Never let processing errors turn into a non-200; log and move on.
    console.error("[webhook/circle] processing error", error)
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
