-- CreateEnum
CREATE TYPE "FundSourceChannel" AS ENUM ('APP_STK', 'C2B_PAYBILL');

-- AlterEnum
ALTER TYPE "FundCategory" ADD VALUE 'SADAKA';

-- AlterTable
ALTER TABLE "Contribution" ADD COLUMN     "paybillNumber" TEXT,
ADD COLUMN     "sourceChannel" "FundSourceChannel" NOT NULL DEFAULT 'APP_STK';

-- AlterTable
ALTER TABLE "crawl_runs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "knowledge_sources" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- CreateTable
CREATE TABLE "UnmatchedPayment" (
    "id" TEXT NOT NULL,
    "mpesaReceiptNo" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payerPhone" TEXT NOT NULL,
    "rawAccountText" TEXT NOT NULL,
    "guessedCategory" "FundCategory",
    "paybillNumber" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedContributionId" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnmatchedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnmatchedPayment_mpesaReceiptNo_key" ON "UnmatchedPayment"("mpesaReceiptNo");

-- CreateIndex
CREATE UNIQUE INDEX "UnmatchedPayment_resolvedContributionId_key" ON "UnmatchedPayment"("resolvedContributionId");

-- CreateIndex
CREATE INDEX "UnmatchedPayment_resolvedAt_idx" ON "UnmatchedPayment"("resolvedAt");

-- AddForeignKey
ALTER TABLE "UnmatchedPayment" ADD CONSTRAINT "UnmatchedPayment_resolvedContributionId_fkey" FOREIGN KEY ("resolvedContributionId") REFERENCES "Contribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

