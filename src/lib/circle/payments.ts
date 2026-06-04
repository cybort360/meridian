import { randomUUID, createHash } from "crypto"
import { getCircleClient } from "./client"
import { ARC_USDC_TOKEN_ADDRESS, USDC_SYMBOL } from "@/lib/constants"
import { baseUnitsToDecimalString } from "@/lib/utils/usdc"
import type {
  TransferParams,
  TransferResult,
  CircleTransactionState,
} from "@/types/circle"

// Deterministic idempotency key from the operation's identifying parts: the
// same inputs always yield the same key, so a retry or rapid double-submit
// reuses the original Circle transfer instead of creating a second one. Shaped
// as a v4-style UUID because Circle expects a UUID-format idempotency key.
export function createIdempotencyKey(...parts: string[]): string {
  const h = createHash("sha256").update(parts.join("|")).digest("hex")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(
    17,
    20
  )}-${h.slice(20, 32)}`
}

// Circle returns 409 when an idempotency key was already used with a different
// payload, or (rarely) while the original is still in flight. Detect it so
// callers can treat a duplicate as already-handled rather than a hard failure.
export function isDuplicateRequestError(error: unknown): boolean {
  const status = (error as { response?: { status?: number }; status?: number })
  const code = status?.response?.status ?? status?.status
  return code === 409
}

const TERMINAL_STATES: CircleTransactionState[] = [
  "COMPLETE",
  "CONFIRMED",
  "FAILED",
  "CANCELLED",
  "DENIED",
]

export function isTerminalState(state: CircleTransactionState): boolean {
  return TERMINAL_STATES.includes(state)
}

// Maps a Circle transaction state to our Payment.status enum.
export function toPaymentStatus(
  state: CircleTransactionState
): "PENDING" | "CONFIRMED" | "FAILED" {
  if (state === "COMPLETE" || state === "CONFIRMED") return "CONFIRMED"
  if (state === "FAILED" || state === "CANCELLED" || state === "DENIED")
    return "FAILED"
  return "PENDING"
}

// Resolves Circle's tokenId for USDC held by a wallet. createTransaction needs
// either a tokenId or tokenAddress + blockchain; the SDK's types collide on the
// `blockchain` key when walletId is used, so we identify USDC by its tokenId.
async function resolveUsdcTokenId(circleWalletId: string): Promise<string> {
  const client = getCircleClient()
  const res = await client.getWalletTokenBalance({ id: circleWalletId })
  const balances = res.data?.tokenBalances ?? []
  const usdc = balances.find(
    (b) =>
      b.token.symbol === USDC_SYMBOL ||
      b.token.tokenAddress?.toLowerCase() ===
        ARC_USDC_TOKEN_ADDRESS.toLowerCase()
  )
  if (!usdc?.token?.id) {
    throw new Error("No USDC balance found in this wallet on Arc to transfer.")
  }
  return usdc.token.id
}

// Initiates a USDC transfer from a Circle wallet to a destination address.
// Returns the transaction id and its initial state; settlement is confirmed
// asynchronously via webhook or by polling with pollTransaction().
export async function transferUSDC(
  params: TransferParams
): Promise<TransferResult> {
  const client = getCircleClient()
  const tokenId = await resolveUsdcTokenId(params.fromCircleWalletId)

  const res = await client.createTransaction({
    walletId: params.fromCircleWalletId,
    tokenId,
    destinationAddress: params.toAddress,
    amount: [baseUnitsToDecimalString(params.amountBaseUnits)],
    fee: {
      type: "level",
      config: { feeLevel: "MEDIUM" },
    },
    // Deterministic when the caller supplies one (money-moving paths do), so a
    // retried request reuses the same on-chain transfer rather than double-paying.
    idempotencyKey: params.idempotencyKey ?? randomUUID(),
  })

  const id = res.data?.id
  if (!id) {
    throw new Error("Circle did not return a transaction id for the transfer.")
  }

  return {
    circlePaymentId: id,
    state: (res.data?.state as CircleTransactionState) ?? "INITIATED",
  }
}

export interface TransactionStatus {
  state: CircleTransactionState
  txHash?: string
}

export async function getTransactionStatus(
  transactionId: string
): Promise<TransactionStatus> {
  const client = getCircleClient()
  const res = await client.getTransaction({ id: transactionId })
  const tx = res.data?.transaction
  return {
    state: (tx?.state as CircleTransactionState) ?? "INITIATED",
    txHash: tx?.txHash,
  }
}

// Polls a transaction until it reaches a terminal state or the timeout
// elapses. Used by the demo transfer flow so the UI can show a final
// status without depending on a publicly reachable webhook endpoint.
export async function pollTransaction(
  transactionId: string,
  { timeoutMs = 30_000, intervalMs = 2_000 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<TransactionStatus> {
  const deadline = Date.now() + timeoutMs
  let status = await getTransactionStatus(transactionId)

  while (!isTerminalState(status.state) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs))
    status = await getTransactionStatus(transactionId)
  }

  return status
}
