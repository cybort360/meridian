import { prisma } from "@/lib/prisma"
import {
  transferUSDC,
  pollTransaction,
  toPaymentStatus,
} from "@/lib/circle/payments"
import type { CircleTransactionState } from "@/types/circle"
import type { InvoiceWithRelations } from "@/lib/invoices"

interface MoveResult {
  circlePaymentId: string
  state: CircleTransactionState
  txHash?: string
}

// Simple on-chain credit passport scoring.
const CREDIT_BASE_SCORE = 500
const SETTLE_SCORE_DELTA = 10

function advanceAmount(amountUSDC: bigint, advanceRate: number): bigint {
  return (amountUSDC * BigInt(advanceRate)) / 100n
}

function feeAmount(base: bigint, feeRate: number): bigint {
  // feeRate is basis points (200 = 2%); charged on the advanced principal.
  return (base * BigInt(feeRate)) / 10_000n
}

export class SettlementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SettlementError"
  }
}

// Move USDC between two wallets and wait for it to settle. Returns the terminal
// status. Throws SettlementError on a confirmed on-chain failure so the caller
// surfaces a clean 400 instead of leaving an invoice half-processed.
//
// NOTE: transfers are direct wallet→wallet. We deliberately do NOT route through
// a per-invoice escrow wallet: on Arc, gas is paid in USDC, so an escrow holding
// exactly the advance can never forward it (Circle rejects amount + estimatedGas
// > balance), which previously failed the second leg and stranded funds with no
// rollback. Direct transfers always come from a wallet that holds a surplus.
async function moveUSDC(
  fromCircleWalletId: string,
  toAddress: string,
  amountBaseUnits: bigint,
  failureMessage: string
): Promise<MoveResult> {
  const tx = await transferUSDC({
    fromCircleWalletId,
    toAddress,
    amountBaseUnits,
  })
  const status = await pollTransaction(tx.circlePaymentId)
  if (toPaymentStatus(status.state) === "FAILED") {
    throw new SettlementError(failureMessage)
  }
  return {
    circlePaymentId: tx.circlePaymentId,
    state: status.state,
    txHash: status.txHash,
  }
}

// Investor funds a SCORED invoice: a single direct transfer of the advance from
// the investor wallet to the SME wallet. Records one ADVANCE payment and moves
// the invoice to ACTIVE. (Single transfer ⇒ inherently atomic — it either lands
// or it doesn't; nothing is left stranded.)
export async function fundInvoice(
  invoiceId: string,
  investorId: string
): Promise<InvoiceWithRelations> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { sme: { include: { wallet: true } } },
  })
  if (!invoice) throw new SettlementError("Invoice not found.")
  if (!invoice.buyerSignedAt) {
    throw new SettlementError("Invoice not yet verified by buyer.")
  }
  if (invoice.status !== "SCORED") {
    throw new SettlementError("This invoice is not available for funding.")
  }
  if (invoice.advanceRate === null) {
    throw new SettlementError("This invoice has not been scored yet.")
  }
  if (invoice.smeId === investorId) {
    throw new SettlementError("You can't fund your own invoice.")
  }

  const smeWallet = invoice.sme.wallet
  if (!smeWallet) {
    throw new SettlementError("The SME does not have a wallet yet.")
  }
  const investorWallet = await prisma.wallet.findUnique({
    where: { userId: investorId },
  })
  if (!investorWallet) {
    throw new SettlementError("You need a wallet before funding invoices.")
  }

  const advance = advanceAmount(invoice.amountUSDC, invoice.advanceRate)
  const fee = feeAmount(advance, invoice.feeRate)

  // Direct: investor → SME.
  const tx = await transferUSDC({
    fromCircleWalletId: investorWallet.circleWalletId,
    toAddress: smeWallet.address,
    amountBaseUnits: advance,
  })
  const status = await pollTransaction(tx.circlePaymentId)
  if (toPaymentStatus(status.state) === "FAILED") {
    throw new SettlementError(
      "The funding transfer failed on-chain. No funds were moved; please try again."
    )
  }

  await prisma.payment.create({
    data: {
      senderWalletId: investorWallet.id,
      receiverWalletId: smeWallet.id,
      invoiceId,
      amountUSDC: advance,
      type: "ADVANCE",
      status: toPaymentStatus(status.state),
      circlePaymentId: tx.circlePaymentId,
      txHash: status.txHash,
      blockchain: smeWallet.blockchain,
    },
  })

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      investorId,
      status: "ACTIVE",
      fundedAt: new Date(),
      feeAmountUSDC: fee,
    },
    include: { sme: true, investor: true },
  })
}

// Settlement (simulates the buyer repaying): the SME wallet pays the investor
// their principal and the platform its fee, both as direct transfers:
//   SME → investor   (principal = advance; type SETTLEMENT)
//   SME → platform   (protocol fee; type FEE)
// The SME retains the remainder (invoice − advance − fee) — no escrow round-trip.
// Records both payments, writes an on-time CreditEvent, and moves the invoice to
// SETTLED. Payments are written as each leg confirms, so a partial failure
// leaves an audit trail and the invoice stays ACTIVE (retryable) rather than
// being marked SETTLED prematurely.
export async function settleInvoice(
  invoiceId: string
): Promise<InvoiceWithRelations> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      sme: { include: { wallet: true } },
      investor: { include: { wallet: true } },
    },
  })
  if (!invoice) throw new SettlementError("Invoice not found.")
  if (invoice.status !== "ACTIVE") {
    throw new SettlementError("Only active invoices can be settled.")
  }
  if (invoice.advanceRate === null || !invoice.investor) {
    throw new SettlementError("This invoice has not been funded.")
  }

  const smeWallet = invoice.sme.wallet
  const investorWallet = invoice.investor.wallet
  if (!smeWallet || !investorWallet) {
    throw new SettlementError("Both parties need wallets to settle.")
  }

  const platformAddress = process.env.PLATFORM_WALLET_ADDRESS
  if (!platformAddress || platformAddress === "REPLACE_ME") {
    throw new SettlementError(
      "Platform fee wallet is not configured (PLATFORM_WALLET_ADDRESS)."
    )
  }

  const principalToInvestor = advanceAmount(
    invoice.amountUSDC,
    invoice.advanceRate
  )
  const feeToProtocol =
    invoice.feeAmountUSDC ?? feeAmount(principalToInvestor, invoice.feeRate)

  // 1. SME → investor: principal (the advance returned).
  const payout = await moveUSDC(
    smeWallet.circleWalletId,
    investorWallet.address,
    principalToInvestor,
    "The investor payout failed on-chain. The invoice was not settled; please try again."
  )
  await prisma.payment.create({
    data: {
      senderWalletId: smeWallet.id,
      receiverWalletId: investorWallet.id,
      invoiceId,
      amountUSDC: principalToInvestor,
      type: "SETTLEMENT",
      status: toPaymentStatus(payout.state),
      circlePaymentId: payout.circlePaymentId,
      txHash: payout.txHash,
      blockchain: smeWallet.blockchain,
    },
  })

  // 2. SME → platform: protocol fee. (The platform address has no Wallet row,
  // so this leg isn't recorded as a Payment; the amount lives on
  // invoice.feeAmountUSDC.)
  if (feeToProtocol > 0n) {
    await moveUSDC(
      smeWallet.circleWalletId,
      platformAddress,
      feeToProtocol,
      "The fee transfer failed on-chain. The investor was already repaid; please retry to complete settlement."
    )
  }

  // Credit passport event for the SME (on-time settlement).
  const last = await prisma.creditEvent.findFirst({
    where: { userId: invoice.smeId },
    orderBy: { createdAt: "desc" },
  })
  const base = last?.newScore ?? CREDIT_BASE_SCORE
  await prisma.creditEvent.create({
    data: {
      userId: invoice.smeId,
      type: "INVOICE_SETTLED_ON_TIME",
      invoiceId,
      scoreChange: SETTLE_SCORE_DELTA,
      newScore: base + SETTLE_SCORE_DELTA,
    },
  })

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "SETTLED", settledAt: new Date() },
    include: { sme: true, investor: true },
  })
}
