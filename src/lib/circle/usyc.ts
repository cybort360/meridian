import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { getCircleClient } from "./client"
import { pollTransaction } from "./payments"
import {
  SEPOLIA_USDC_ADDRESS,
  USYC_BLOCKCHAIN,
  USYC_TELLER_ADDRESS,
  USYC_TOKEN_ADDRESS,
} from "@/lib/constants"
import type { YieldPosition } from "@prisma/client"

const MEDIUM_FEE = { type: "level" as const, config: { feeLevel: "MEDIUM" as const } }
const YEAR_MS = 365 * 24 * 60 * 60 * 1000

export type YieldMode = "SIMULATED" | "REAL"

// USYC isn't on Arc, so a real subscribe/redeem runs on Ethereum Sepolia. The
// mode is env-driven: "simulated" (default) models the flow on Arc as a ledger
// earmark; "real" calls the actual USYC Teller contract on Sepolia.
export function getYieldMode(): YieldMode {
  return process.env.USYC_MODE === "real" ? "REAL" : "SIMULATED"
}

// APY snapshot stored on each position so accrual is stable even if the env
// rate changes later. 4.5% -> 450 bps.
function currentApyBps(): number {
  return Math.round(Number(process.env.USYC_APY ?? "4.5") * 100)
}

// Arithmetic accrual used for simulated positions (and as a display estimate
// for real ones): principal × (1 + apy × elapsedYears).
function accruedValue(
  principalBase: bigint,
  apyBps: number,
  openedAt: Date,
  asOf: Date = new Date()
): bigint {
  const years = (asOf.getTime() - openedAt.getTime()) / YEAR_MS
  const factor = 1 + (apyBps / 10_000) * Math.max(0, years)
  return BigInt(Math.round(Number(principalBase) * factor))
}

export interface YieldPositionView {
  id: string
  principalBase: string
  currentValueBase: string
  yieldEarnedBase: string
  apyBps: number
  mode: YieldMode
  chain: string
  shares: string | null
  subscribeTxHash: string | null
  openedAt: string
}

export interface YieldSummary {
  mode: YieldMode
  apyBps: number
  principalBase: string
  currentValueBase: string
  yieldEarnedBase: string
  positions: YieldPositionView[]
}

function viewOf(p: YieldPosition): YieldPositionView {
  const current = accruedValue(p.principalUSDC, p.apyBps, p.openedAt)
  return {
    id: p.id,
    principalBase: p.principalUSDC.toString(),
    currentValueBase: current.toString(),
    yieldEarnedBase: (current - p.principalUSDC).toString(),
    apyBps: p.apyBps,
    mode: p.mode as YieldMode,
    chain: p.chain,
    shares: p.shares,
    subscribeTxHash: p.subscribeTxHash,
    openedAt: p.openedAt.toISOString(),
  }
}

// Returns the investor's active yield positions plus rolled-up totals.
export async function getYieldSummary(userId: string): Promise<YieldSummary> {
  const positions = await prisma.yieldPosition.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { openedAt: "desc" },
  })

  const views = positions.map(viewOf)
  const principal = views.reduce((s, v) => s + BigInt(v.principalBase), 0n)
  const value = views.reduce((s, v) => s + BigInt(v.currentValueBase), 0n)

  return {
    mode: getYieldMode(),
    apyBps: currentApyBps(),
    principalBase: principal.toString(),
    currentValueBase: value.toString(),
    yieldEarnedBase: (value - principal).toString(),
    positions: views,
  }
}

// ── Real-mode (Sepolia) helpers ──────────────────────────────────────────────
// A single configured Sepolia wallet backs the real demo; create + fund it once
// (USDC + Sepolia ETH for gas) and put its id in USYC_SEPOLIA_WALLET_ID.
function sepoliaWalletId(): string {
  const id = process.env.USYC_SEPOLIA_WALLET_ID
  if (!id) {
    throw new Error(
      "Real USYC mode needs USYC_SEPOLIA_WALLET_ID (a funded Circle wallet on Ethereum Sepolia)."
    )
  }
  return id
}

async function walletAddress(circleWalletId: string): Promise<string> {
  const client = getCircleClient()
  const res = await client.getWallet({ id: circleWalletId })
  const address = res.data?.wallet?.address
  if (!address) throw new Error("Could not resolve the Sepolia wallet address.")
  return address
}

async function usycSharesOf(circleWalletId: string): Promise<string> {
  const client = getCircleClient()
  const res = await client.getWalletTokenBalance({ id: circleWalletId })
  const usyc = (res.data?.tokenBalances ?? []).find(
    (b) =>
      b.token.symbol === "USYC" ||
      b.token.tokenAddress?.toLowerCase() === USYC_TOKEN_ADDRESS.toLowerCase()
  )
  return usyc?.amount ?? "0"
}

// ── Subscribe (USDC → USYC) ──────────────────────────────────────────────────
export async function subscribe(
  userId: string,
  amountBaseUnits: bigint
): Promise<YieldPositionView> {
  const mode = getYieldMode()
  const apyBps = currentApyBps()

  if (mode === "SIMULATED") {
    const position = await prisma.yieldPosition.create({
      data: {
        userId,
        principalUSDC: amountBaseUnits,
        apyBps,
        mode: "SIMULATED",
        chain: "ARC-TESTNET",
      },
    })
    return viewOf(position)
  }

  // REAL: approve the Teller to pull USDC, then Teller.deposit(assets, receiver)
  // on Ethereum Sepolia via Circle contract execution.
  const client = getCircleClient()
  const walletId = sepoliaWalletId()
  const receiver = await walletAddress(walletId)
  const amount = amountBaseUnits.toString()

  const approve = await client.createContractExecutionTransaction({
    walletId,
    contractAddress: SEPOLIA_USDC_ADDRESS,
    abiFunctionSignature: "approve(address,uint256)",
    abiParameters: [USYC_TELLER_ADDRESS, amount],
    fee: MEDIUM_FEE,
    idempotencyKey: randomUUID(),
  })
  const approveId = approve.data?.id
  if (!approveId) throw new Error("Circle did not return an approval transaction id.")
  const approveStatus = await pollTransaction(approveId)
  if (approveStatus.state === "FAILED" || approveStatus.state === "CANCELLED") {
    throw new Error("USDC approval to the USYC Teller failed.")
  }

  const deposit = await client.createContractExecutionTransaction({
    walletId,
    contractAddress: USYC_TELLER_ADDRESS,
    abiFunctionSignature: "deposit(uint256,address)",
    abiParameters: [amount, receiver],
    fee: MEDIUM_FEE,
    idempotencyKey: randomUUID(),
  })
  const depositId = deposit.data?.id
  if (!depositId) throw new Error("Circle did not return a deposit transaction id.")
  const depositStatus = await pollTransaction(depositId)
  if (depositStatus.state === "FAILED" || depositStatus.state === "CANCELLED") {
    throw new Error("USYC subscription (deposit) failed on Sepolia.")
  }

  const shares = await usycSharesOf(walletId)
  const position = await prisma.yieldPosition.create({
    data: {
      userId,
      principalUSDC: amountBaseUnits,
      shares,
      apyBps,
      mode: "REAL",
      chain: USYC_BLOCKCHAIN,
      subscribeTxHash: depositStatus.txHash,
    },
  })
  return viewOf(position)
}

// ── Redeem (USYC → USDC) ─────────────────────────────────────────────────────
export interface RedeemResult {
  positionId: string
  principalBase: string
  payoutBase: string
  yieldEarnedBase: string
  redeemTxHash?: string
}

export async function redeem(
  userId: string,
  positionId: string
): Promise<RedeemResult> {
  const position = await prisma.yieldPosition.findFirst({
    where: { id: positionId, userId, status: "ACTIVE" },
  })
  if (!position) {
    throw new Error("That yield position was not found or is already redeemed.")
  }

  const payout = accruedValue(position.principalUSDC, position.apyBps, position.openedAt)
  let redeemTxHash: string | undefined

  if (position.mode === "REAL") {
    // Teller.redeem(shares, receiver, account) on Sepolia.
    const client = getCircleClient()
    const walletId = sepoliaWalletId()
    const holder = await walletAddress(walletId)
    const shares = position.shares ?? (await usycSharesOf(walletId))

    const tx = await client.createContractExecutionTransaction({
      walletId,
      contractAddress: USYC_TELLER_ADDRESS,
      abiFunctionSignature: "redeem(uint256,address,address)",
      abiParameters: [shares, holder, holder],
      fee: MEDIUM_FEE,
      idempotencyKey: randomUUID(),
    })
    const txId = tx.data?.id
    if (!txId) throw new Error("Circle did not return a redeem transaction id.")
    const status = await pollTransaction(txId)
    if (status.state === "FAILED" || status.state === "CANCELLED") {
      throw new Error("USYC redemption failed on Sepolia.")
    }
    redeemTxHash = status.txHash
  }

  await prisma.yieldPosition.update({
    where: { id: position.id },
    data: { status: "REDEEMED", closedAt: new Date(), redeemTxHash },
  })

  return {
    positionId: position.id,
    principalBase: position.principalUSDC.toString(),
    payoutBase: payout.toString(),
    yieldEarnedBase: (payout - position.principalUSDC).toString(),
    redeemTxHash,
  }
}
