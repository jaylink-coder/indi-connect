-- DropIndex
DROP INDEX IF EXISTS "Member_clerkUserId_key";

-- AlterTable
ALTER TABLE "Member" DROP COLUMN IF EXISTS "clerkUserId";
