-- CreateTable
CREATE TABLE "Dependent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "gender" "Gender",
    "guardianId" TEXT,
    "localChurchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dependent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Dependent" ADD CONSTRAINT "Dependent_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dependent" ADD CONSTRAINT "Dependent_localChurchId_fkey" FOREIGN KEY ("localChurchId") REFERENCES "LocalChurch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: GroupMembership - memberId becomes optional, dependentId added
ALTER TABLE "GroupMembership" ALTER COLUMN "memberId" DROP NOT NULL;
ALTER TABLE "GroupMembership" ADD COLUMN "dependentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_dependentId_groupId_key" ON "GroupMembership"("dependentId", "groupId");

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "Dependent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: MemberMilestoneRecord - memberId becomes optional, dependentId added
ALTER TABLE "MemberMilestoneRecord" ALTER COLUMN "memberId" DROP NOT NULL;
ALTER TABLE "MemberMilestoneRecord" ADD COLUMN "dependentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MemberMilestoneRecord_dependentId_milestoneTypeId_key" ON "MemberMilestoneRecord"("dependentId", "milestoneTypeId");

-- AddForeignKey
ALTER TABLE "MemberMilestoneRecord" ADD CONSTRAINT "MemberMilestoneRecord_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "Dependent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
