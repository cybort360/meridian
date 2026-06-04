import { prisma } from "@/lib/prisma"
import {
  transferUSDC,
  pollTransaction,
  toPaymentStatus,
  createIdempotencyKey,
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
  failureMessage: string,
  idempotencyKey?: string
): Promise<MoveResult> {
  const tx = await transferUSDC({
    fromCircleWalletId,
    toAddress,
    amountBaseUnits,
    idempotencyKey,
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

  // Atomic claim: flip SCORED → FUNDED only while it's still SCORED. A rapid
  // double-submit makes the second update affect 0 rows, so only one request
  // ever proceeds to move money. (This is what prevents a double-fund — we do
  // it before the transfer, not inside a DB transaction wrapped around the
  // multi-second Circle poll, which would exhaust a pooled connection.)
  const claim = await prisma.invoice.updateMany({
    where: { id: invoiceId, status: "SCORED" },
    data: { status: "FUNDED", investorId },
  })
  if (claim.count === 0) {
    throw new SettlementError("This invoice is not available for funding.")
  }

  try {
    // Direct: investor → SME, with a deterministic key so a retry can't create
    // a second on-chain transfer.
    const tx = await transferUSDC({
      fromCircleWalletId: investorWallet.circleWalletId,
      toAddress: smeWallet.address,
      amountBaseUnits: advance,
      idempotencyKey: createIdempotencyKey(invoiceId, "FUND", investorId),
    })
    const status = await pollTransaction(tx.circlePaymentId)
    if (toPaymentStatus(status.state) === "FAILED") {
      throw new SettlementError(
        "The funding transfer failed on-chain. No funds were moved; please try again."
      )
    }

    // Record + finalize atomically once Circle confirms. Payment is upserted by
    // its unique circlePaymentId, so a duplicate webhook/retry can't double-write.
    return await prisma.$transaction(async (txdb) => {
      await txdb.payment.upsert({
        where: { circlePaymentId: tx.circlePaymentId },
        create: {
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
        update: { status: toPaymentStatus(status.state), txHash: status.txHash },
      })
      return txdb.invoice.update({
        where: { id: invoiceId },
        data: {
          investorId,
          status: "ACTIVE",
          fundedAt: new Date(),
          feeAmountUSDC: fee,
        },
        include: { sme: true, investor: true },
      })
    })
  } catch (error) {
    // Roll the claim back so the invoice is fundable again — but only if it's
    // still FUNDED (i.e. we never reached ACTIVE). A successful run won't match.
    await prisma.invoice.updateMany({
      where: { id: invoiceId, status: "FUNDED" },
      data: { status: "SCORED", investorId: null },
    })
    throw error
  }
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

  // 1. SME → investor: principal (the advance returned). Deterministic key ⇒ a
  // retry reuses the same transfer rather than paying the investor twice.
  const payout = await moveUSDC(
    smeWallet.circleWalletId,
    investorWallet.address,
    principalToInvestor,
    "The investor payout failed on-chain. The invoice was not settled; please try again.",
    createIdempotencyKey(invoiceId, "SETTLE-PRINCIPAL")
  )
  await prisma.payment.upsert({
    where: { circlePaymentId: payout.circlePaymentId },
    create: {
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
    update: { status: toPaymentStatus(payout.state), txHash: payout.txHash },
  })

  // 2. SME → platform: protocol fee. (The platform address has no Wallet row,
  // so this leg isn't recorded as a Payment; the amount lives on
  // invoice.feeAmountUSDC.)
  if (feeToProtocol > 0n) {
    await moveUSDC(
      smeWallet.circleWalletId,
      platformAddress,
      feeToProtocol,
      "The fee transfer failed on-chain. The investor was already repaid; please retry to complete settlement.",
      createIdempotencyKey(invoiceId, "SETTLE-FEE")
    )
  }

  // Finalize atomically: flip ACTIVE → SETTLED exactly once, and only the call
  // that wins the transition writes the credit event — so a double-submit can't
  // double-score the SME's passport.
  const finalized = await prisma.$transaction(async (txdb) => {
    const flip = await txdb.invoice.updateMany({
      where: { id: invoiceId, status: "ACTIVE" },
      data: { status: "SETTLED", settledAt: new Date() },
    })
    if (flip.count === 1) {
      const last = await txdb.creditEvent.findFirst({
        where: { userId: invoice.smeId },
        orderBy: { createdAt: "desc" },
      })
      const base = last?.newScore ?? CREDIT_BASE_SCORE
      await txdb.creditEvent.create({
        data: {
          userId: invoice.smeId,
          type: "INVOICE_SETTLED_ON_TIME",
          invoiceId,
          scoreChange: SETTLE_SCORE_DELTA,
          newScore: base + SETTLE_SCORE_DELTA,
        },
      })
    }
    return txdb.invoice.findUnique({
      where: { id: invoiceId },
      include: { sme: true, investor: true },
    })
  })

  if (!finalized) throw new SettlementError("Invoice not found after settlement.")
  return finalized
}
