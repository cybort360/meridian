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

// Simulates buyer repayment + settlement waterfall:
//   SME wallet → investor wallet for (principal advance + fee yield).
// (The per-invoice escrow served its purpose at funding; settlement pays the
// investor their principal plus yield directly.) Records SETTLEMENT payment,
// writes a positive CreditEvent for the SME, and moves invoice to SETTLED.
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

  const advance = advanceAmount(invoice.amountUSDC, invoice.advanceRate)
  const fee = feeAmount(advance, invoice.feeRate)
  const investorReturn = advance + fee

  const settlement = await transferUSDC({
    fromCircleWalletId: smeWallet.circleWalletId,
    toAddress: investorWallet.address,
    amountBaseUnits: investorReturn,
  })
  const status = await pollTransaction(settlement.circlePaymentId)

  await prisma.payment.create({
    data: {
      senderWalletId: smeWallet.id,
      receiverWalletId: investorWallet.id,
      invoiceId,
      amountUSDC: investorReturn,
      type: "SETTLEMENT",
      status: toPaymentStatus(status.state),
      circlePaymentId: settlement.circlePaymentId,
      txHash: status.txHash,
      blockchain: smeWallet.blockchain,
    },
  })

  // Credit passport event for the SME.
  const last = await prisma.creditEvent.findFirst({
    where: { userId: invoice.smeId },
    orderBy: { createdAt: "desc" },
  })
  const base = last?.newScore ?? CREDIT_BASE_SCORE
  await prisma.creditEvent.create({
    data: {
      userId: invoice.smeId,
      type: "INVOICE_SETTLED",
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
