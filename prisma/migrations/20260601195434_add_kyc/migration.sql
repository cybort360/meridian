-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED';

-- CreateTable
CREATE TABLE "KycSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legalBusinessName" TEXT NOT NULL,
    "tradeLicenseNumber" TEXT NOT NULL,
    "commercialRegNumber" TEXT NOT NULL,
    "businessAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'UAE',
    "industry" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "tradeLicenseDocUrl" TEXT NOT NULL,
    "ownerIdDocUrl" TEXT NOT NULL,
    "proofOfAddressUrl" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KycSubmission_userId_key" ON "KycSubmission"("userId");

-- AddForeignKey
ALTER TABLE "KycSubmission" ADD CONSTRAINT "KycSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
