-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProjectStatus" ADD VALUE 'PLANNED';
ALTER TYPE "ProjectStatus" ADD VALUE 'STALLED';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "leadContact" TEXT,
ADD COLUMN     "location" TEXT;

-- AlterTable
ALTER TABLE "crawl_runs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "knowledge_sources" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");
