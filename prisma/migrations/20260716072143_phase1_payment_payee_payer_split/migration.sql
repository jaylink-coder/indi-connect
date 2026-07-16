-- AlterTable
ALTER TABLE "Contribution" ADD COLUMN     "paidByMemberId" TEXT;

-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN     "paidByMemberId" TEXT;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_paidByMemberId_fkey" FOREIGN KEY ("paidByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_paidByMemberId_fkey" FOREIGN KEY ("paidByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

