-- AlterTable
ALTER TABLE "Member" DROP COLUMN IF EXISTS "cessTargetAmount";

-- AlterTable
ALTER TABLE "LocalChurch" ADD COLUMN "cessTargetAmount" DECIMAL(12,2);
