import path from "path"

// KYC documents are PII (trade licenses, passports, Emirates IDs). They are
// stored OUTSIDE /public so Next never serves them statically, and are reachable
// only through the authenticated /api/kyc/document/[key] route.
export const KYC_DIR = path.join(process.cwd(), "private-uploads", "kyc")

export const KYC_FIELDS = ["tradeLicense", "ownerId", "proofOfAddress"] as const
export type KycField = (typeof KYC_FIELDS)[number]

export const KYC_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
}

// storageKey shape: <userId>-<field>-<32 hex chars>.<ext>
// userId is a cuid (no hyphens), so it's a safe prefix for ownership checks.
const KEY_RE =
  /^[a-z0-9]+-(tradeLicense|ownerId|proofOfAddress)-[a-f0-9]{32}\.(pdf|jpg|png)$/

export function isValidKey(key: string): boolean {
  return KEY_RE.test(key)
}

export function extOf(key: string): string {
  return key.slice(key.lastIndexOf(".") + 1)
}

// True if the document belongs to the given user (encoded in the key prefix).
export function keyBelongsTo(key: string, userId: string): boolean {
  return key.startsWith(`${userId}-`)
}

// Extracts the storage key from a "/api/kyc/document/<key>" URL.
export function keyFromUrl(url: string): string | null {
  const m = url.match(/^\/api\/kyc\/document\/([^/?#]+)$/)
  return m ? decodeURIComponent(m[1]) : null
}

export function urlForKey(key: string): string {
  return `/api/kyc/document/${key}`
}
