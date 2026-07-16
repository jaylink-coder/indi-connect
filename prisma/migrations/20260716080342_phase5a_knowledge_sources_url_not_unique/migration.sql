-- DropIndex
DROP INDEX "knowledge_sources_url_key";

-- AlterTable
ALTER TABLE "crawl_runs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "knowledge_sources" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- CreateIndex
CREATE INDEX "knowledge_sources_url_idx" ON "knowledge_sources"("url");

