-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('PERSON', 'ORGANIZATION', 'CHURCH');

-- CreateEnum
CREATE TYPE "PledgeStatus" AS ENUM ('ACTIVE', 'FULFILLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TestimonyCategory" AS ENUM ('SALVATION', 'HEALING', 'FINANCIAL_BREAKTHROUGH', 'EMPLOYMENT', 'RESTORATION', 'SPIRITUAL_GROWTH', 'ACADEMIC', 'OTHER');

-- AlterTable: Organization display-currency toggle
ALTER TABLE "organizations" ADD COLUMN "secondaryCurrency" TEXT,
ADD COLUMN "secondaryCurrencyRate" DOUBLE PRECISION;

-- AlterTable: User additive fellowship-leader grant
ALTER TABLE "users" ADD COLUMN "isFellowshipLeader" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Fund deadline
ALTER TABLE "funds" ADD COLUMN "deadlineDate" TIMESTAMP(3);

-- CreateTable: Partner
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL DEFAULT 'PERSON',
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "partners_organizationId_idx" ON "partners"("organizationId");
ALTER TABLE "partners" ADD CONSTRAINT "partners_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Pledge -- memberId becomes optional, add partnerId + status
ALTER TABLE "pledges" ALTER COLUMN "memberId" DROP NOT NULL;
ALTER TABLE "pledges" ADD COLUMN "partnerId" TEXT,
ADD COLUMN "status" "PledgeStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: GivingRecord -- partnerId
ALTER TABLE "giving_records" ADD COLUMN "partnerId" TEXT;
ALTER TABLE "giving_records" ADD CONSTRAINT "giving_records_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: FellowshipReport -- refNumber (0 existing rows, safe as NOT NULL directly)
ALTER TABLE "fellowship_reports" ADD COLUMN "refNumber" TEXT NOT NULL;
CREATE UNIQUE INDEX "fellowship_reports_organizationId_refNumber_key" ON "fellowship_reports"("organizationId", "refNumber");

-- CreateTable: FundRequisition
CREATE TABLE "fund_requisitions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "departmentId" TEXT,
    "fellowshipId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RequisitionStatus" NOT NULL DEFAULT 'REQUESTED',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_requisitions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "fund_requisitions_organizationId_idx" ON "fund_requisitions"("organizationId");
ALTER TABLE "fund_requisitions" ADD CONSTRAINT "fund_requisitions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fund_requisitions" ADD CONSTRAINT "fund_requisitions_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fund_requisitions" ADD CONSTRAINT "fund_requisitions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fund_requisitions" ADD CONSTRAINT "fund_requisitions_fellowshipId_fkey" FOREIGN KEY ("fellowshipId") REFERENCES "fellowships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fund_requisitions" ADD CONSTRAINT "fund_requisitions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: RequisitionAccountability
CREATE TABLE "requisition_accountabilities" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "amountSpent" DECIMAL(14,2) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requisition_accountabilities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "requisition_accountabilities_requisitionId_key" ON "requisition_accountabilities"("requisitionId");
CREATE INDEX "requisition_accountabilities_organizationId_idx" ON "requisition_accountabilities"("organizationId");
ALTER TABLE "requisition_accountabilities" ADD CONSTRAINT "requisition_accountabilities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requisition_accountabilities" ADD CONSTRAINT "requisition_accountabilities_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "fund_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requisition_accountabilities" ADD CONSTRAINT "requisition_accountabilities_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requisition_accountabilities" ADD CONSTRAINT "requisition_accountabilities_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: RequisitionReceipt
CREATE TABLE "requisition_receipts" (
    "id" TEXT NOT NULL,
    "accountabilityId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "requisition_receipts_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "requisition_receipts" ADD CONSTRAINT "requisition_receipts_accountabilityId_fkey" FOREIGN KEY ("accountabilityId") REFERENCES "requisition_accountabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requisition_receipts" ADD CONSTRAINT "requisition_receipts_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: EventDebrief
CREATE TABLE "event_debriefs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "venue" TEXT,
    "actualAttendance" INTEGER,
    "ministers" TEXT,
    "strengths" TEXT,
    "challenges" TEXT,
    "recommendations" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_debriefs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "event_debriefs_eventId_key" ON "event_debriefs"("eventId");
CREATE INDEX "event_debriefs_organizationId_idx" ON "event_debriefs"("organizationId");
ALTER TABLE "event_debriefs" ADD CONSTRAINT "event_debriefs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_debriefs" ADD CONSTRAINT "event_debriefs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_debriefs" ADD CONSTRAINT "event_debriefs_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Testimony
CREATE TABLE "testimonies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "category" "TestimonyCategory" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimonies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "testimonies_organizationId_idx" ON "testimonies"("organizationId");
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS -- ministry-data tables, no platform-admin bypass (Section 6).
ALTER TABLE "partners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partners" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "partners"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "fund_requisitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fund_requisitions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "fund_requisitions"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "requisition_accountabilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "requisition_accountabilities" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "requisition_accountabilities"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

-- requisition_receipts has no organizationId of its own -- scoped via an
-- EXISTS subquery against its parent accountability, same technique already
-- used for asset_condition_photos and fellowship_report_attendees.
ALTER TABLE "requisition_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "requisition_receipts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "requisition_receipts"
  USING (EXISTS (
    SELECT 1 FROM "requisition_accountabilities"
    WHERE "requisition_accountabilities"."id" = "requisition_receipts"."accountabilityId"
      AND "requisition_accountabilities"."organizationId" = current_setting('app.current_org_id', true)::text
  ));

ALTER TABLE "event_debriefs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_debriefs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "event_debriefs"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "testimonies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "testimonies" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "testimonies"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON "partners", "fund_requisitions", "requisition_accountabilities", "requisition_receipts", "event_debriefs", "testimonies" TO scholars_life_mmp_app;
