-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "GLTransactionType" AS ENUM ('CONTRIBUTION', 'EXPENSE', 'JOURNAL', 'REVERSAL');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

-- DropForeignKey
ALTER TABLE "GroupMembership" DROP CONSTRAINT "GroupMembership_dependentId_fkey";

-- DropForeignKey
ALTER TABLE "GroupMembership" DROP CONSTRAINT "GroupMembership_memberId_fkey";

-- DropForeignKey
ALTER TABLE "MemberMilestoneRecord" DROP CONSTRAINT "MemberMilestoneRecord_dependentId_fkey";

-- DropForeignKey
ALTER TABLE "MemberMilestoneRecord" DROP CONSTRAINT "MemberMilestoneRecord_memberId_fkey";

-- AlterTable
ALTER TABLE "crawl_runs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "knowledge_sources" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "fundCategory" "FundCategory",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GLTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "debitAccountId" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "txnType" "GLTransactionType" NOT NULL,
    "scopeTier" "HierarchyTier" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "contributionId" TEXT,
    "expenseId" TEXT,
    "reversalOfId" TEXT,
    "postedByMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GLTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "scopeTier" "HierarchyTier" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "vendorName" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "submittedByMemberId" TEXT NOT NULL,
    "approvedByMemberId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "paidByMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_code_key" ON "Account"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Account_fundCategory_key" ON "Account"("fundCategory");

-- CreateIndex
CREATE UNIQUE INDEX "GLTransaction_reversalOfId_key" ON "GLTransaction"("reversalOfId");

-- CreateIndex
CREATE INDEX "GLTransaction_scopeTier_scopeId_idx" ON "GLTransaction"("scopeTier", "scopeId");

-- CreateIndex
CREATE INDEX "GLTransaction_debitAccountId_idx" ON "GLTransaction"("debitAccountId");

-- CreateIndex
CREATE INDEX "GLTransaction_creditAccountId_idx" ON "GLTransaction"("creditAccountId");

-- CreateIndex
CREATE INDEX "GLTransaction_contributionId_idx" ON "GLTransaction"("contributionId");

-- CreateIndex
CREATE INDEX "GLTransaction_expenseId_idx" ON "GLTransaction"("expenseId");

-- CreateIndex
CREATE INDEX "GLTransaction_date_idx" ON "GLTransaction"("date");

-- CreateIndex
CREATE INDEX "Expense_scopeTier_scopeId_idx" ON "Expense"("scopeTier", "scopeId");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "Dependent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberMilestoneRecord" ADD CONSTRAINT "MemberMilestoneRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberMilestoneRecord" ADD CONSTRAINT "MemberMilestoneRecord_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "Dependent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLTransaction" ADD CONSTRAINT "GLTransaction_debitAccountId_fkey" FOREIGN KEY ("debitAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLTransaction" ADD CONSTRAINT "GLTransaction_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLTransaction" ADD CONSTRAINT "GLTransaction_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLTransaction" ADD CONSTRAINT "GLTransaction_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLTransaction" ADD CONSTRAINT "GLTransaction_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "GLTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLTransaction" ADD CONSTRAINT "GLTransaction_postedByMemberId_fkey" FOREIGN KEY ("postedByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_submittedByMemberId_fkey" FOREIGN KEY ("submittedByMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_approvedByMemberId_fkey" FOREIGN KEY ("approvedByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidByMemberId_fkey" FOREIGN KEY ("paidByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
