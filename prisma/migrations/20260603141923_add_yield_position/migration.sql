-- CreateEnum
CREATE TYPE "YieldMode" AS ENUM ('SIMULATED', 'REAL');

-- CreateEnum
CREATE TYPE "YieldStatus" AS ENUM ('ACTIVE', 'REDEEMED');

-- CreateTable
CREATE TABLE "YieldPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "principalUSDC" BIGINT NOT NULL,
    "shares" TEXT,
    "apyBps" INTEGER NOT NULL,
    "mode" "YieldMode" NOT NULL,
    "chain" TEXT NOT NULL,
    "status" "YieldStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscribeTxHash" TEXT,
    "redeemTxHash" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "YieldPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "YieldPosition_userId_status_idx" ON "YieldPosition"("userId", "status");

-- AddForeignKey
ALTER TABLE "YieldPosition" ADD CONSTRAINT "YieldPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
