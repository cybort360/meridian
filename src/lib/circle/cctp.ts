import { BridgeKit } from "@circle-fin/bridge-kit"
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets"
import { isCircleConfigured, CircleConfigError } from "@/lib/circle/client"

// CCTP burns USDC on Arc and mints it on the destination chain via Circle's
// Bridge Kit. The Forwarding Service (useForwarder) handles attestation +
// mint, so no destination wallet is required — EOA wallets share the same
// address across EVM chains, so we mint back to the same address.
export const CCTP_SOURCE_CHAIN = "Arc_Testnet"
export const CCTP_DEFAULT_DESTINATION = "Base_Sepolia"
export const CCTP_DESTINATIONS = [
  "Base_Sepolia",
  "Ethereum_Sepolia",
  "Arbitrum_Sepolia",
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
}

export async function bridgeUSDCFromArc(params: {
  fromAddress: string
  amount: string
  destinationChain?: (typeof CCTP_DESTINATIONS)[number]
}): Promise<CctpResult> {
  if (!isCircleConfigured()) {
    throw new CircleConfigError(
      "Circle is not configured. Set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET in .env.local."
    )
  }

  const destinationChain = params.destinationChain ?? CCTP_DEFAULT_DESTINATION

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

  return {
    state: result?.state ?? "unknown",
    amount: params.amount,
    destinationChain,
    steps,
  }
}
