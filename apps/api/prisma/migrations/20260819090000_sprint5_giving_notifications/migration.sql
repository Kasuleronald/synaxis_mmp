-- CreateEnum
CREATE TYPE "LeadershipRole" AS ENUM ('PASTOR', 'DIRECTORATE_LEADER', 'DEPARTMENT_LEADER', 'FELLOWSHIP_LEADER', 'BRANCH_LEADER');

-- CreateEnum
CREATE TYPE "GivingMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE', 'OTHER');

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "leadershipRoles" "LeadershipRole"[] NOT NULL DEFAULT ARRAY[]::"LeadershipRole"[];

-- CreateTable
CREATE TABLE "giving_categories" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "giving_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "giving_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "categoryId" TEXT NOT NULL,
    "memberId" TEXT,
    "giverName" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "method" "GivingMethod" NOT NULL DEFAULT 'CASH',
    "providerRef" TEXT,
    "givenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "giving_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "giving_categories_organizationId_idx" ON "giving_categories"("organizationId");

-- CreateIndex
CREATE INDEX "giving_records_organizationId_idx" ON "giving_records"("organizationId");

-- CreateIndex
CREATE INDEX "giving_records_categoryId_idx" ON "giving_records"("categoryId");

-- CreateIndex
CREATE INDEX "giving_records_givenAt_idx" ON "giving_records"("givenAt");

-- CreateIndex
CREATE INDEX "notifications_organizationId_idx" ON "notifications"("organizationId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- AddForeignKey
ALTER TABLE "giving_categories" ADD CONSTRAINT "giving_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giving_records" ADD CONSTRAINT "giving_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giving_records" ADD CONSTRAINT "giving_records_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giving_records" ADD CONSTRAINT "giving_records_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "giving_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giving_records" ADD CONSTRAINT "giving_records_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giving_records" ADD CONSTRAINT "giving_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS -- ministry-data tables, no platform-admin bypass (Section 6).
ALTER TABLE "giving_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "giving_categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "giving_categories"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "giving_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "giving_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "giving_records"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "notifications"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON "giving_categories", "giving_records", "notifications" TO life_mmp_app;
