-- CreateTable
CREATE TABLE "ProcessedWebhook" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedWebhook_eventId_key" ON "ProcessedWebhook"("eventId");

-- CreateIndex
CREATE INDEX "CreditEvent_userId_idx" ON "CreditEvent"("userId");

-- CreateIndex
CREATE INDEX "CreditEvent_createdAt_idx" ON "CreditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Invoice_smeId_idx" ON "Invoice"("smeId");

-- CreateIndex
CREATE INDEX "Invoice_investorId_idx" ON "Invoice"("investorId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_senderWalletId_idx" ON "Payment"("senderWalletId");

-- CreateIndex
CREATE INDEX "Payment_receiverWalletId_idx" ON "Payment"("receiverWalletId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");
