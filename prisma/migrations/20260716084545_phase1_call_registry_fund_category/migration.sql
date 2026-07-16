-- AlterEnum
ALTER TYPE "FundCategory" ADD VALUE 'CALL_REGISTRY';

-- AlterTable
ALTER TABLE "crawl_runs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "knowledge_sources" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

