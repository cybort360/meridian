-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "buyerSignature" TEXT,
ADD COLUMN "buyerSignedAt" TIMESTAMP(3),
ADD COLUMN "buyerVerificationToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_buyerVerificationToken_key" ON "Invoice"("buyerVerificationToken");
