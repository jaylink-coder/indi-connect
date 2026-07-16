-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "activationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "activationCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "activationCodeHash" TEXT,
ADD COLUMN     "activationCodeSentAt" TIMESTAMP(3);

