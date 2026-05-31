import { prisma } from "@/lib/prisma"
import { createWallet } from "@/lib/circle/wallets"
import {
  transferUSDC,
  pollTransaction,
  toPaymentStatus,
} from "@/lib/circle/payments"
import type { InvoiceWithRelations } from "@/lib/invoices"

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

// Investor funds a SCORED invoice:
//   investor wallet → per-invoice escrow wallet → SME wallet
// Both legs are recorded as ADVANCE payments and the invoice moves to ACTIVE.
export async function fundInvoice(
  invoiceId: string,
  investorId: string
): Promise<InvoiceWithRelations> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { sme: { include: { wallet: true } } },
  })
  if (!invoice) throw new SettlementError("Invoice not found.")
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

  // Dedicated escrow wallet for this invoice, persisted as a Wallet row so both
  // transfer legs can be recorded as Payments.
  const escrowCircle = await createWallet(`escrow-${invoiceId}`)
  const escrowWallet = await prisma.wallet.create({
    data: {
      circleWalletId: escrowCircle.circleWalletId,
      address: escrowCircle.address,
      blockchain: escrowCircle.blockchain,
      isEscrow: true,
      invoiceId,
    },
  })

  // Leg 1: investor → escrow (wait for settlement before disbursing onward).
  const toEscrow = await transferUSDC({
    fromCircleWalletId: investorWallet.circleWalletId,
    toAddress: escrowWallet.address,
    amountBaseUnits: advance,
  })
  const escrowStatus = await pollTransaction(toEscrow.circlePaymentId)

  // Leg 2: escrow → SME
  const toSme = await transferUSDC({
    fromCircleWalletId: escrowWallet.circleWalletId,
    toAddress: smeWallet.address,
    amountBaseUnits: advance,
  })
  const smeStatus = await pollTransaction(toSme.circlePaymentId)

  // Record both advance legs.
  await prisma.payment.createMany({
    data: [
      {
        senderWalletId: investorWallet.id,
        receiverWalletId: escrowWallet.id,
        invoiceId,
        amountUSDC: advance,
        type: "ADVANCE",
        status: toPaymentStatus(escrowStatus.state),
        circlePaymentId: toEscrow.circlePaymentId,
        txHash: escrowStatus.txHash,
        blockchain: escrowWallet.blockchain,
      },
      {
        senderWalletId: escrowWallet.id,
        receiverWalletId: smeWallet.id,
        invoiceId,
        amountUSDC: advance,
        type: "ADVANCE",
        status: toPaymentStatus(smeStatus.state),
        circlePaymentId: toSme.circlePaymentId,
        txHash: smeStatus.txHash,
        blockchain: smeWallet.blockchain,
      },
    ],
  })

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      investorId,
      escrowWalletId: escrowWallet.circleWalletId,
      status: "ACTIVE",
      fundedAt: new Date(),
      feeAmountUSDC: fee,
    },
    include: { sme: true, investor: true },
  })
}

// Settlement waterfall (simulates the buyer repaying):
//   SME wallet  → escrow            (full invoice amount)
//   escrow      → investor wallet   (principal = advance; type SETTLEMENT)
//   escrow      → platform wallet   (protocol fee)
//   escrow      → SME wallet        (holdback = invoice − advance − fee)
// Records REPAYMENT + SETTLEMENT payments, writes an on-time CreditEvent for
// the SME, and moves the invoice to SETTLED.
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

  const escrowWallet = await prisma.wallet.findFirst({
    where: { invoiceId, isEscrow: true },
  })
  if (!escrowWallet) {
    throw new SettlementError("Escrow wallet not found for this invoice.")
  }

  const platformAddress = process.env.PLATFORM_WALLET_ADDRESS
  if (!platformAddress || platformAddress === "REPLACE_ME") {
    throw new SettlementError(
      "Platform fee wallet is not configured (PLATFORM_WALLET_ADDRESS)."
    )
  }

  const amount = invoice.amountUSDC
  const principalToInvestor = advanceAmount(amount, invoice.advanceRate)
  const feeToProtocol =
    invoice.feeAmountUSDC ?? feeAmount(principalToInvestor, invoice.feeRate)
  const holdbackToSme = amount - principalToInvestor - feeToProtocol

  // 1. SME → escrow: full invoice amount (simulates the buyer repaying).
  const repay = await transferUSDC({
    fromCircleWalletId: smeWallet.circleWalletId,
    toAddress: escrowWallet.address,
    amountBaseUnits: amount,
  })
  const repayStatus = await pollTransaction(repay.circlePaymentId)
  await prisma.payment.create({
    data: {
      senderWalletId: smeWallet.id,
      receiverWalletId: escrowWallet.id,
      invoiceId,
      amountUSDC: amount,
      type: "REPAYMENT",
      status: toPaymentStatus(repayStatus.state),
      circlePaymentId: repay.circlePaymentId,
      txHash: repayStatus.txHash,
      blockchain: smeWallet.blockchain,
    },
  })

  // 2. escrow → investor: principal (the advance).
  const payout = await transferUSDC({
    fromCircleWalletId: escrowWallet.circleWalletId,
    toAddress: investorWallet.address,
    amountBaseUnits: principalToInvestor,
  })
  const payoutStatus = await pollTransaction(payout.circlePaymentId)
  await prisma.payment.create({
    data: {
      senderWalletId: escrowWallet.id,
      receiverWalletId: investorWallet.id,
      invoiceId,
      amountUSDC: principalToInvestor,
      type: "SETTLEMENT",
      status: toPaymentStatus(payoutStatus.state),
      circlePaymentId: payout.circlePaymentId,
      txHash: payoutStatus.txHash,
      blockchain: escrowWallet.blockchain,
    },
  })

  // 3. escrow → platform fee wallet: protocol fee.
  const feeTransfer = await transferUSDC({
    fromCircleWalletId: escrowWallet.circleWalletId,
    toAddress: platformAddress,
    amountBaseUnits: feeToProtocol,
  })
  await pollTransaction(feeTransfer.circlePaymentId)

  // 4. escrow → SME: holdback (invoice − advance − fee), so escrow nets to zero.
  if (holdbackToSme > 0n) {
    const holdback = await transferUSDC({
      fromCircleWalletId: escrowWallet.circleWalletId,
      toAddress: smeWallet.address,
      amountBaseUnits: holdbackToSme,
    })
    await pollTransaction(holdback.circlePaymentId)
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
