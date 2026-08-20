-- CreateEnum
CREATE TYPE "PledgeFrequency" AS ENUM ('ONE_TIME', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "giving_categories" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "giving_records" ADD COLUMN     "fundId" TEXT,
ADD COLUMN     "pledgeId" TEXT,
ADD COLUMN     "batchId" TEXT;

-- CreateTable
CREATE TABLE "funds" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" DECIMAL(14,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pledges" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "fundId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "frequency" "PledgeFrequency" NOT NULL DEFAULT 'ONE_TIME',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pledges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "giving_batches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "batchDate" TIMESTAMP(3) NOT NULL,
    "declaredTotal" DECIMAL(14,2),
    "currency" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "giving_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "giving_categories_parentId_idx" ON "giving_categories"("parentId");

-- CreateIndex
CREATE INDEX "funds_organizationId_idx" ON "funds"("organizationId");

-- CreateIndex
CREATE INDEX "vendors_organizationId_idx" ON "vendors"("organizationId");

-- CreateIndex
CREATE INDEX "pledges_organizationId_idx" ON "pledges"("organizationId");

-- CreateIndex
CREATE INDEX "pledges_memberId_idx" ON "pledges"("memberId");

-- CreateIndex
CREATE INDEX "giving_batches_organizationId_idx" ON "giving_batches"("organizationId");

-- AddForeignKey
ALTER TABLE "giving_categories" ADD CONSTRAINT "giving_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "giving_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giving_records" ADD CONSTRAINT "giving_records_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giving_records" ADD CONSTRAINT "giving_records_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "pledges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giving_records" ADD CONSTRAINT "giving_records_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "giving_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funds" ADD CONSTRAINT "funds_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giving_batches" ADD CONSTRAINT "giving_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giving_batches" ADD CONSTRAINT "giving_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- RLS -- ministry-data tables, no platform-admin bypass (Section 6).
ALTER TABLE "funds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "funds" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "funds"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "vendors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendors" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "vendors"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "pledges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pledges" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "pledges"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "giving_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "giving_batches" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "giving_batches"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON "funds", "vendors", "pledges", "giving_batches" TO life_mmp_app;
