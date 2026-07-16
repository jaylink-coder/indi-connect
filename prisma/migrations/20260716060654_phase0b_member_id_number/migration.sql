-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "idNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Member_idNumber_key" ON "Member"("idNumber");

