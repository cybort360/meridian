import { randomUUID } from "crypto"
import type {
  AccountType,
  Blockchain,
} from "@circle-fin/developer-controlled-wallets"
import { getCircleClient, getWalletSetId } from "./client"
import {
  CIRCLE_ACCOUNT_TYPE,
  CIRCLE_BLOCKCHAIN,
  ARC_USDC_TOKEN_ADDRESS,
  USDC_SYMBOL,
} from "@/lib/constants"
import { decimalStringToBaseUnits, formatUSDC } from "@/lib/utils/usdc"
import type { WalletBalance } from "@/types/wallet"
import type { WalletTransaction, CircleTransactionState } from "@/types/circle"

export interface CreatedWallet {
  circleWalletId: string
  address: string
  blockchain: string
}

// Creates a single Circle wallet on Arc testnet inside the configured
// wallet set. `refId` ties the Circle wallet back to our own record.
export async function createWallet(refId: string): Promise<CreatedWallet> {
  const client = getCircleClient()
  const walletSetId = getWalletSetId()

  const res = await client.createWallets({
    accountType: CIRCLE_ACCOUNT_TYPE as AccountType,
    blockchains: [CIRCLE_BLOCKCHAIN as Blockchain],
    count: 1,
    walletSetId,
    metadata: [{ refId }],
  })

  const wallet = res.data?.wallets?.[0]
  if (!wallet) {
    throw new Error("Circle did not return a wallet on creation.")
  }

  return {
    circleWalletId: wallet.id,
    address: wallet.address,
    blockchain: wallet.blockchain,
  }
}

// Returns the wallet's USDC balance. Circle reports balances as decimal
// strings; we also expose base units for exact math.
export async function getWalletBalance(
  circleWalletId: string
): Promise<WalletBalance> {
  const client = getCircleClient()
  const res = await client.getWalletTokenBalance({ id: circleWalletId })

  const balances = res.data?.tokenBalances ?? []
  const usdc = balances.find(
    (b) =>
      b.token.symbol === USDC_SYMBOL ||
      b.token.tokenAddress?.toLowerCase() ===
        ARC_USDC_TOKEN_ADDRESS.toLowerCase()
  )

  const amount = usdc?.amount ?? "0"

  return {
    circleWalletId,
    address: "",
    usdcBalance: formatUSDC(amount),
    usdcBalanceRaw: decimalStringToBaseUnits(amount),
    blockchain: CIRCLE_BLOCKCHAIN,
  }
}

// Returns normalized transfer history for a wallet, newest first.
export async function getWalletTransactions(
  circleWalletId: string
): Promise<WalletTransaction[]> {
  const client = getCircleClient()
  const res = await client.listTransactions({
    walletIds: [circleWalletId],
    pageSize: 50,
  })

  const transactions = res.data?.transactions ?? []

  return transactions.map((tx) => {
    const direction = tx.transactionType === "INBOUND" ? "INBOUND" : "OUTBOUND"
    return {
      id: tx.id,
      direction,
      amount: tx.amounts?.[0] ?? "0",
      state: tx.state as CircleTransactionState,
      txHash: tx.txHash,
      counterpartyAddress:
        direction === "INBOUND" ? tx.sourceAddress : tx.destinationAddress,
      createDate: tx.createDate,
    }
  })
}

// Idempotency key helper for callers that need to issue mutating requests.
export function newIdempotencyKey(): string {
  return randomUUID()
}
