-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "OrgUnitType" AS ENUM ('DIRECTORATE', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ENROLLED', 'COMPLETED', 'DROPPED');

-- AlterTable
ALTER TABLE "attendance_sessions" ADD COLUMN     "classId" TEXT;

-- AlterTable
ALTER TABLE "members" DROP COLUMN "dateOfBirth",
ADD COLUMN     "birthDay" INTEGER,
ADD COLUMN     "birthMonth" INTEGER,
ADD COLUMN     "birthYear" INTEGER,
ADD COLUMN     "fellowshipId" TEXT,
ADD COLUMN     "isStudent" BOOLEAN,
ADD COLUMN     "maritalStatus" "MaritalStatus",
ADD COLUMN     "orgUnitId" TEXT,
ADD COLUMN     "school" TEXT;

-- CreateTable
CREATE TABLE "fellowships" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "leaderId" TEXT,
    "meetingDay" TEXT,
    "meetingLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fellowships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_units" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "parentId" TEXT,
    "type" "OrgUnitType" NOT NULL,
    "name" TEXT NOT NULL,
    "headId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discipleship_programs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discipleship_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discipleship_classes" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "instructorId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discipleship_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_enrollments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fellowships_organizationId_idx" ON "fellowships"("organizationId");

-- CreateIndex
CREATE INDEX "org_units_organizationId_idx" ON "org_units"("organizationId");

-- CreateIndex
CREATE INDEX "org_units_parentId_idx" ON "org_units"("parentId");

-- CreateIndex
CREATE INDEX "discipleship_programs_organizationId_idx" ON "discipleship_programs"("organizationId");

-- CreateIndex
CREATE INDEX "discipleship_classes_organizationId_idx" ON "discipleship_classes"("organizationId");

-- CreateIndex
CREATE INDEX "discipleship_classes_programId_idx" ON "discipleship_classes"("programId");

-- CreateIndex
CREATE INDEX "class_enrollments_organizationId_idx" ON "class_enrollments"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "class_enrollments_classId_memberId_key" ON "class_enrollments"("classId", "memberId");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_fellowshipId_fkey" FOREIGN KEY ("fellowshipId") REFERENCES "fellowships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_classId_fkey" FOREIGN KEY ("classId") REFERENCES "discipleship_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellowships" ADD CONSTRAINT "fellowships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellowships" ADD CONSTRAINT "fellowships_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discipleship_programs" ADD CONSTRAINT "discipleship_programs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discipleship_classes" ADD CONSTRAINT "discipleship_classes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discipleship_classes" ADD CONSTRAINT "discipleship_classes_programId_fkey" FOREIGN KEY ("programId") REFERENCES "discipleship_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discipleship_classes" ADD CONSTRAINT "discipleship_classes_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "discipleship_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS -- ministry-data tables, no platform-admin bypass (Section 6).
ALTER TABLE "fellowships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fellowships" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "fellowships"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "org_units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_units" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "org_units"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "discipleship_programs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "discipleship_programs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "discipleship_programs"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "discipleship_classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "discipleship_classes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "discipleship_classes"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "class_enrollments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "class_enrollments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "class_enrollments"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON "fellowships", "org_units", "discipleship_programs", "discipleship_classes", "class_enrollments" TO life_mmp_app;
