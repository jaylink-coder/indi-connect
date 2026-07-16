-- AlterTable
ALTER TABLE "Member" DROP COLUMN "activationAttempts",
DROP COLUMN "activationCodeExpiresAt",
DROP COLUMN "activationCodeHash",
DROP COLUMN "activationCodeSentAt",
ADD COLUMN     "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinLockedUntil" TIMESTAMP(3),
ADD COLUMN     "pinSetAt" TIMESTAMP(3);
