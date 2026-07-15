
-- CreateEnum
CREATE TYPE "HierarchyTier" AS ENUM ('LOCAL_CHURCH', 'PARISH', 'DIOCESE', 'HEADQUARTERS');
CREATE TYPE "FundCategory" AS ENUM ('TITHE', 'CESS', 'OPERATIONS', 'PROJECT');

-- CreateTable
CREATE TABLE "NationalHeadquarters" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'AIPCA Supreme Board - Bahati HQ',
    "archbishopName" TEXT NOT NULL,
    CONSTRAINT "NationalHeadquarters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Archdiocese" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headquartersId" TEXT NOT NULL,
    CONSTRAINT "Archdiocese_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diocese" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bishopName" TEXT NOT NULL,
    "archidId" TEXT NOT NULL,
    CONSTRAINT "Diocese_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parish" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dioceseId" TEXT NOT NULL,
    "tithePaybill" TEXT NOT NULL DEFAULT '700000',
    "cessPaybill" TEXT NOT NULL DEFAULT '700001',
    "operationsPaybill" TEXT NOT NULL DEFAULT '700002',
    "projectsPaybill" TEXT NOT NULL DEFAULT '700003',
    CONSTRAINT "Parish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalChurch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    CONSTRAINT "LocalChurch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "membershipNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "localChurchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" "FundCategory" NOT NULL,
    "mpesaReceiptNo" TEXT NOT NULL,
    "dateTransacted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_membershipNo_key" ON "Member"("membershipNo");
CREATE UNIQUE INDEX "Member_phone_key" ON "Member"("phone");
CREATE UNIQUE INDEX "Contribution_mpesaReceiptNo_key" ON "Contribution"("mpesaReceiptNo");

-- AddForeignKey
ALTER TABLE "Archdiocese" ADD CONSTRAINT "Archdiocese_headquartersId_fkey" FOREIGN KEY ("headquartersId") REFERENCES "NationalHeadquarters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Diocese" ADD CONSTRAINT "Diocese_archidId_fkey" FOREIGN KEY ("archidId") REFERENCES "Archdiocese"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Parish" ADD CONSTRAINT "Parish_dioceseId_fkey" FOREIGN KEY ("dioceseId") REFERENCES "Diocese"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LocalChurch" ADD CONSTRAINT "LocalChurch_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Member" ADD CONSTRAINT "Member_localChurchId_fkey" FOREIGN KEY ("localChurchId") REFERENCES "LocalChurch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

