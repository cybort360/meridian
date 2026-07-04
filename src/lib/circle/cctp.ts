import crypto from "crypto"
import { BridgeKit } from "@circle-fin/bridge-kit"
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets"
import { isCircleConfigured } from "@/lib/circle/client"
import { ARC_EXPLORER_URL, arcTxUrl } from "@/lib/constants"

// CCTP burns USDC on Arc and mints it on the destination chain via Circle's
// Bridge Kit + Forwarding Service. CCTP support varies by Circle sandbox, so a
// failure (or missing config) falls back to a clearly-labelled MOCK so the
// cross-border demo always returns a transaction id.
export const CCTP_SOURCE_CHAIN = "Arc_Testnet"
export const CCTP_DEFAULT_DESTINATION = "Ethereum_Sepolia"
export const CCTP_DESTINATIONS = [
  "Ethereum_Sepolia",
  "Avalanche_Fuji",
] as const

export interface CctpStep {
  name: string
  state: string
  txHash?: string
  explorerUrl?: string
}

export interface CctpResult {
  state: string
  amount: string
  destinationChain: string
  steps: CctpStep[]
  txHash?: string
  explorerUrl?: string
  mock: boolean
}

function mockResult(
  amount: string,
  destinationChain: string,
  reason: string
): CctpResult {
  // ----- MOCK (demo only) -----
  // Fabricated tx hash so the UI can show the end-to-end flow when real CCTP
  // isn't available on this Circle sandbox / route.
  console.warn(`[cctp] returning mock transfer: ${reason}`)
  const fakeTx = `0x${crypto.randomBytes(32).toString("hex")}`
  return {
    state: "success",
    amount,
    destinationChain,
    steps: [
      { name: "burn", state: "success", txHash: fakeTx, explorerUrl: arcTxUrl(fakeTx) },
      { name: "mint", state: "success" },
    ],
    txHash: fakeTx,
    explorerUrl: arcTxUrl(fakeTx),
    mock: true,
  }
}

export async function bridgeUSDCFromArc(params: {
  fromAddress: string
  amount: string
  destinationChain?: (typeof CCTP_DESTINATIONS)[number]
}): Promise<CctpResult> {
  const destinationChain = params.destinationChain ?? CCTP_DEFAULT_DESTINATION

  // If Circle isn't configured, there's no real path - return the mock.
  if (!isCircleConfigured()) {
    return mockResult(params.amount, destinationChain, "Circle not configured")
  }

  try {
    // ----- REAL CCTP (Circle Bridge Kit) -----
    const adapter = createCircleWalletsAdapter({
      apiKey: process.env.CIRCLE_API_KEY!,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
    })

    const kit = new BridgeKit()
    const result = await kit.bridge({
      from: { adapter, chain: CCTP_SOURCE_CHAIN, address: params.fromAddress },
      to: {
        recipientAddress: params.fromAddress,
        chain: destinationChain,
        useForwarder: true,
      },
      amount: params.amount,
    })

    const steps: CctpStep[] = (result?.steps ?? []).map((s: CctpStep) => ({
      name: s.name,
      state: s.state,
      txHash: s.txHash,
      explorerUrl: s.explorerUrl,
    }))
    const burn = steps.find((s) => s.txHash)

    return {
      state: result?.state ?? "unknown",
      amount: params.amount,
      destinationChain,
      steps,
      txHash: burn?.txHash,
      explorerUrl:
        burn?.explorerUrl ?? (burn?.txHash ? arcTxUrl(burn.txHash) : undefined),
      mock: false,
    }
  } catch (error) {
    // CCTP unavailable on this sandbox/route → mock for the demo.
    return mockResult(
      params.amount,
      destinationChain,
      error instanceof Error ? error.message : "bridge failed"
    )
  }
}

// Exported for callers that want to link to the source-chain explorer.
export const CCTP_EXPLORER_BASE = ARC_EXPLORER_URL
