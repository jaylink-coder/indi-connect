-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "GroupCategory" AS ENUM ('MEN', 'MOTHERS_COUNCIL', 'MEDIUM', 'VICTORY', 'YOUTH', 'BRIGADE', 'SUNDAY_SCHOOL', 'CHOIR', 'THE_ANOINTED');

-- CreateEnum
CREATE TYPE "GroupMembershipStatus" AS ENUM ('PROBATION', 'ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "gender" "Gender";

-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "category" "GroupCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "localChurchId" TEXT NOT NULL,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "genderRestriction" "Gender",

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMembership" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "joinedGroupAt" DATE NOT NULL,
    "probationEndsAt" DATE NOT NULL,
    "status" "GroupMembershipStatus" NOT NULL DEFAULT 'PROBATION',
    "endedAt" DATE,

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MilestoneType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberMilestoneRecord" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "milestoneTypeId" TEXT NOT NULL,
    "achievedAt" DATE NOT NULL,

    CONSTRAINT "MemberMilestoneRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_category_localChurchId_key" ON "Group"("category", "localChurchId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_memberId_groupId_key" ON "GroupMembership"("memberId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneType_key_key" ON "MilestoneType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "MemberMilestoneRecord_memberId_milestoneTypeId_key" ON "MemberMilestoneRecord"("memberId", "milestoneTypeId");

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_localChurchId_fkey" FOREIGN KEY ("localChurchId") REFERENCES "LocalChurch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberMilestoneRecord" ADD CONSTRAINT "MemberMilestoneRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberMilestoneRecord" ADD CONSTRAINT "MemberMilestoneRecord_milestoneTypeId_fkey" FOREIGN KEY ("milestoneTypeId") REFERENCES "MilestoneType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
