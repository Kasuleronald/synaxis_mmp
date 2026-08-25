-- CreateEnum
CREATE TYPE "WorkingStatus" AS ENUM ('EMPLOYED', 'SELF_EMPLOYED', 'UNEMPLOYED', 'STUDYING');

-- CreateEnum
CREATE TYPE "SoulWinningStage" AS ENUM ('WON', 'ATTENDING_PROGRAMS', 'VISITED', 'ALLOCATED_TO_FELLOWSHIP', 'ENROLLED_NEW_BELIEVERS_CLASS', 'COMPLETED_NEW_BELIEVERS_CLASS');

-- AlterTable: working status on Member, terminology + appointable flags
ALTER TABLE "members" ADD COLUMN "workingStatus" "WorkingStatus";
ALTER TABLE "organizations" ADD COLUMN "devotionalTerm" TEXT;
ALTER TABLE "users" ADD COLUMN "isDevotionalEditor" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Daily Devotional
CREATE TABLE "devotionals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "scripture" TEXT,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devotionals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "devotionals_organizationId_date_key" ON "devotionals"("organizationId", "date");
CREATE INDEX "devotionals_organizationId_idx" ON "devotionals"("organizationId");

ALTER TABLE "devotionals" ADD CONSTRAINT "devotionals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devotionals" ADD CONSTRAINT "devotionals_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "devotionals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "devotionals" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "devotionals"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON "devotionals" TO scholars_life_mmp_app;

-- CreateTable: Soul Winning
CREATE TABLE "soul_winning_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "wonAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wonWhere" TEXT,
    "stage" "SoulWinningStage" NOT NULL DEFAULT 'WON',
    "assignedToId" TEXT,
    "fellowshipId" TEXT,
    "classId" TEXT,
    "memberId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soul_winning_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "soul_winning_records_memberId_key" ON "soul_winning_records"("memberId");
CREATE INDEX "soul_winning_records_organizationId_idx" ON "soul_winning_records"("organizationId");

ALTER TABLE "soul_winning_records" ADD CONSTRAINT "soul_winning_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "soul_winning_records" ADD CONSTRAINT "soul_winning_records_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "soul_winning_records" ADD CONSTRAINT "soul_winning_records_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "soul_winning_records" ADD CONSTRAINT "soul_winning_records_fellowshipId_fkey" FOREIGN KEY ("fellowshipId") REFERENCES "fellowships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "soul_winning_records" ADD CONSTRAINT "soul_winning_records_classId_fkey" FOREIGN KEY ("classId") REFERENCES "discipleship_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "soul_winning_records" ADD CONSTRAINT "soul_winning_records_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "soul_winning_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "soul_winning_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "soul_winning_records"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON "soul_winning_records" TO scholars_life_mmp_app;

-- CreateTable: soul_winning_stage_changes has no organizationId of its own
-- -- scoped via an EXISTS subquery against its parent record, same
-- technique already used for fixed_asset_photos/requisition_receipts.
CREATE TABLE "soul_winning_stage_changes" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "stage" "SoulWinningStage" NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "soul_winning_stage_changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "soul_winning_stage_changes_recordId_idx" ON "soul_winning_stage_changes"("recordId");

ALTER TABLE "soul_winning_stage_changes" ADD CONSTRAINT "soul_winning_stage_changes_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "soul_winning_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "soul_winning_stage_changes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "soul_winning_stage_changes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "soul_winning_stage_changes"
  USING (EXISTS (
    SELECT 1 FROM "soul_winning_records"
    WHERE "soul_winning_records"."id" = "soul_winning_stage_changes"."recordId"
      AND "soul_winning_records"."organizationId" = current_setting('app.current_org_id', true)::text
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON "soul_winning_stage_changes" TO scholars_life_mmp_app;

-- CreateTable: Service Units
CREATE TABLE "service_units" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leaderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_units_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_units_organizationId_idx" ON "service_units"("organizationId");

ALTER TABLE "service_units" ADD CONSTRAINT "service_units_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_units" ADD CONSTRAINT "service_units_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "service_units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_units" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "service_units"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON "service_units" TO scholars_life_mmp_app;

-- CreateTable: service_unit_members has no organizationId of its own --
-- scoped via an EXISTS subquery against its parent service unit.
CREATE TABLE "service_unit_members" (
    "id" TEXT NOT NULL,
    "serviceUnitId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_unit_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_unit_members_serviceUnitId_memberId_key" ON "service_unit_members"("serviceUnitId", "memberId");
CREATE INDEX "service_unit_members_serviceUnitId_idx" ON "service_unit_members"("serviceUnitId");

ALTER TABLE "service_unit_members" ADD CONSTRAINT "service_unit_members_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES "service_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_unit_members" ADD CONSTRAINT "service_unit_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_unit_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_unit_members" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "service_unit_members"
  USING (EXISTS (
    SELECT 1 FROM "service_units"
    WHERE "service_units"."id" = "service_unit_members"."serviceUnitId"
      AND "service_units"."organizationId" = current_setting('app.current_org_id', true)::text
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON "service_unit_members" TO scholars_life_mmp_app;
