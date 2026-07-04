import { randomUUID, randomBytes } from "crypto"
import { getCircleClient } from "./client"
import { pollTransaction } from "./payments"
import {
  ARC_GATEWAY_DOMAIN,
  ARC_USDC_TOKEN_ADDRESS,
  CIRCLE_BLOCKCHAIN,
  GATEWAY_API_URL,
  GATEWAY_MINTER_ADDRESS,
  GATEWAY_WALLET_ADDRESS,
} from "@/lib/constants"
import { fromUSDCBaseUnits, formatUSDC } from "@/lib/utils/usdc"

const MEDIUM_FEE = { type: "level" as const, config: { feeLevel: "MEDIUM" as const } }

export interface GatewayDepositResult {
  approveTxHash?: string
  depositTxHash?: string
  state: string
}

// Deposits USDC from a Circle wallet on Arc into the Gateway Wallet contract,
// funding the user's unified USDC balance. Two on-chain steps: approve the
// Gateway Wallet to pull the USDC, then call deposit(token, amount). Driven
// through Circle's contract-execution API - no Solidity, no deployed contracts
// of our own. https://developers.circle.com/gateway
export async function depositToGateway(
  circleWalletId: string,
  amountBaseUnits: bigint
): Promise<GatewayDepositResult> {
  const client = getCircleClient()
  const amount = amountBaseUnits.toString()

  // 1. approve(spender = Gateway Wallet, amount) on the USDC token.
  const approve = await client.createContractExecutionTransaction({
    walletId: circleWalletId,
    contractAddress: ARC_USDC_TOKEN_ADDRESS,
    abiFunctionSignature: "approve(address,uint256)",
    abiParameters: [GATEWAY_WALLET_ADDRESS, amount],
    fee: MEDIUM_FEE,
    idempotencyKey: randomUUID(),
  })
  const approveId = approve.data?.id
  if (!approveId) {
    throw new Error("Circle did not return a transaction id for the approval.")
  }
  const approveStatus = await pollTransaction(approveId)
  if (approveStatus.state === "FAILED" || approveStatus.state === "CANCELLED") {
    throw new Error("USDC approval to the Gateway Wallet failed.")
  }

  // 2. deposit(token, amount) on the Gateway Wallet.
  const deposit = await client.createContractExecutionTransaction({
    walletId: circleWalletId,
    contractAddress: GATEWAY_WALLET_ADDRESS,
    abiFunctionSignature: "deposit(address,uint256)",
    abiParameters: [ARC_USDC_TOKEN_ADDRESS, amount],
    fee: MEDIUM_FEE,
    idempotencyKey: randomUUID(),
  })
  const depositId = deposit.data?.id
  if (!depositId) {
    throw new Error("Circle did not return a transaction id for the deposit.")
  }
  const depositStatus = await pollTransaction(depositId)

  return {
    approveTxHash: approveStatus.txHash,
    depositTxHash: depositStatus.txHash,
    state: depositStatus.state,
  }
}

interface GatewayBalanceRow {
  domain: number
  depositor: string
  balance: string
}

export interface UnifiedBalance {
  totalUSDC: string // formatted for display, e.g. "1,234.56"
  totalUSDCRaw: string // base units, for exact math in the UI
  perDomain: Array<{ domain: number; balance: string }>
}

// Reads the unified USDC balance for a depositor address across all chains via
// the public Gateway balances endpoint (no auth). Omitting `domain` returns
// every chain's balance for the address; we sum them for the unified figure.
export async function getUnifiedBalance(
  depositorAddress: string
): Promise<UnifiedBalance> {
  const res = await fetch(`${GATEWAY_API_URL}/v1/balances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: "USDC",
      sources: [{ depositor: depositorAddress }],
    }),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Gateway balances request failed (${res.status}).`)
  }

  const json = (await res.json()) as { balances?: GatewayBalanceRow[] }
  const rows = json.balances ?? []

  // Balances come back as decimal USDC strings. Sum precisely in base units.
  const totalBase = rows.reduce((acc, r) => {
    const [whole = "0", frac = ""] = (r.balance ?? "0").split(".")
    const frac6 = (frac + "000000").slice(0, 6)
    return acc + BigInt(whole) * 1_000_000n + BigInt(frac6 || "0")
  }, 0n)

  // Only surface domains that actually hold a balance - the API returns a row
  // per supported chain (mostly zeros), which otherwise reads as "12 chains
  // contributing" even when the funds sit on one chain.
  const contributing = rows.filter((r) => {
    const [whole = "0", frac = ""] = (r.balance ?? "0").split(".")
    return BigInt(whole) > 0n || /[1-9]/.test(frac)
  })

  return {
    totalUSDC: formatUSDC(fromUSDCBaseUnits(totalBase)),
    totalUSDCRaw: totalBase.toString(),
    perDomain: contributing.map((r) => ({ domain: r.domain, balance: r.balance })),
  }
}

export const GATEWAY_CHAIN = CIRCLE_BLOCKCHAIN

// ── Withdraw: bring unified USDC balance back to Arc ─────────────────────────
// Gateway moves USDC by burn-and-mint (no DEX, 1:1): sign a burn intent, get an
// attestation from /v1/transfer, then call gatewayMint on the destination
// minter. Here source = destination = Arc (a same-chain withdrawal back to a
// spendable Arc address), whose only cost is gas for the burn.

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000"
const MAX_UINT256 = ((1n << 256n) - 1n).toString()
// Ceiling on the fee Circle may collect. Same-chain withdrawals only pay burn
// gas, so a small cap comfortably covers it.
const GATEWAY_MAX_FEE = 100_000n // 0.10 USDC

// Left-pad a 20-byte EVM address into a 32-byte hex value for TransferSpec.
function toBytes32(address: string): string {
  return "0x" + address.toLowerCase().replace(/^0x/, "").padStart(64, "0")
}

interface TransferAttestation {
  attestation: string
  signature: string
}

export interface GatewayWithdrawResult {
  mintTxHash?: string
  state: string
}

export async function withdrawToArc(
  circleWalletId: string,
  walletAddress: string,
  amountBaseUnits: bigint
): Promise<GatewayWithdrawResult> {
  const client = getCircleClient()

  // 1. Build the burn intent (EIP-712). Source and destination are both Arc.
  const spec = {
    version: 1,
    sourceDomain: ARC_GATEWAY_DOMAIN,
    destinationDomain: ARC_GATEWAY_DOMAIN,
    sourceContract: toBytes32(GATEWAY_WALLET_ADDRESS),
    destinationContract: toBytes32(GATEWAY_MINTER_ADDRESS),
    sourceToken: toBytes32(ARC_USDC_TOKEN_ADDRESS),
    destinationToken: toBytes32(ARC_USDC_TOKEN_ADDRESS),
    sourceDepositor: toBytes32(walletAddress),
    destinationRecipient: toBytes32(walletAddress),
    sourceSigner: toBytes32(walletAddress),
    destinationCaller: ZERO_BYTES32, // anyone may submit the mint
    value: amountBaseUnits.toString(),
    salt: "0x" + randomBytes(32).toString("hex"),
    hookData: "0x",
  }
  const burnIntent = {
    maxBlockHeight: MAX_UINT256,
    maxFee: GATEWAY_MAX_FEE.toString(),
    spec,
  }

  const typedData = {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
      ],
      TransferSpec: [
        { name: "version", type: "uint32" },
        { name: "sourceDomain", type: "uint32" },
        { name: "destinationDomain", type: "uint32" },
        { name: "sourceContract", type: "bytes32" },
        { name: "destinationContract", type: "bytes32" },
        { name: "sourceToken", type: "bytes32" },
        { name: "destinationToken", type: "bytes32" },
        { name: "sourceDepositor", type: "bytes32" },
        { name: "destinationRecipient", type: "bytes32" },
        { name: "sourceSigner", type: "bytes32" },
        { name: "destinationCaller", type: "bytes32" },
        { name: "value", type: "uint256" },
        { name: "salt", type: "bytes32" },
        { name: "hookData", type: "bytes" },
      ],
      BurnIntent: [
        { name: "maxBlockHeight", type: "uint256" },
        { name: "maxFee", type: "uint256" },
        { name: "spec", type: "TransferSpec" },
      ],
    },
    domain: { name: "GatewayWallet", version: "1" },
    primaryType: "BurnIntent",
    message: burnIntent,
  }

  // 2. Sign it with the developer-controlled wallet.
  const signed = await client.signTypedData({
    walletId: circleWalletId,
    data: JSON.stringify(typedData),
  })
  const signature = signed.data?.signature
  if (!signature) {
    throw new Error("Could not sign the Gateway withdrawal intent.")
  }

  // 3. Request the attestation from the Gateway API.
  const res = await fetch(`${GATEWAY_API_URL}/v1/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ burnIntent, signature }]),
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Gateway transfer request failed (${res.status}).`)
  }
  const json = await res.json()
  const transfer: TransferAttestation = Array.isArray(json) ? json[0] : json
  if (!transfer?.attestation || !transfer?.signature) {
    throw new Error("Gateway did not return a mint attestation.")
  }

  // 4. Mint on Arc: gatewayMint(attestation, operatorSignature).
  const mint = await client.createContractExecutionTransaction({
    walletId: circleWalletId,
    contractAddress: GATEWAY_MINTER_ADDRESS,
    abiFunctionSignature: "gatewayMint(bytes,bytes)",
    abiParameters: [transfer.attestation, transfer.signature],
    fee: MEDIUM_FEE,
    idempotencyKey: randomUUID(),
  })
  const mintId = mint.data?.id
  if (!mintId) {
    throw new Error("Circle did not return a mint transaction id.")
  }
  const mintStatus = await pollTransaction(mintId)

  return { mintTxHash: mintStatus.txHash, state: mintStatus.state }
}
