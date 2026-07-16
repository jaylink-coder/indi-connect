-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "knowledge_sources" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "raw_markdown" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "previous_version_id" TEXT,
    "crawled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_runs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "attempted" INTEGER NOT NULL DEFAULT 0,
    "succeeded" INTEGER NOT NULL DEFAULT 0,
    "changed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "crawl_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_sources_url_key" ON "knowledge_sources"("url");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_sources_previous_version_id_key" ON "knowledge_sources"("previous_version_id");

-- CreateIndex
CREATE INDEX "knowledge_sources_review_status_idx" ON "knowledge_sources"("review_status");

-- AddForeignKey
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_previous_version_id_fkey" FOREIGN KEY ("previous_version_id") REFERENCES "knowledge_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

