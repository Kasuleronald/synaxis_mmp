-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isRegistrationApprover" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "fellowships" ADD COLUMN     "meetingTime" TEXT;

-- AlterTable
ALTER TABLE "households" ADD COLUMN     "address" TEXT;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "members_createdById_idx" ON "members"("createdById");

-- CreateTable
CREATE TABLE "self_registrations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "gender" "Gender",
    "address" TEXT,
    "notes" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "memberIdCreated" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "self_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "self_registrations_organizationId_idx" ON "self_registrations"("organizationId");

-- AddForeignKey
ALTER TABLE "self_registrations" ADD CONSTRAINT "self_registrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "self_registrations" ADD CONSTRAINT "self_registrations_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- RLS -- ministry-data table, no platform-admin bypass (Section 6).
ALTER TABLE "self_registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "self_registrations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "self_registrations"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON "self_registrations" TO life_mmp_app;

-- Public self-registration flow (parallels public_checkin_rls): a visitor
-- filling out /register/:slug has no session, so resolving the Organization
-- by its slug needs the same kind of narrow, single-purpose carve-out the
-- QR check-in flow uses for attendance_sessions -- scoped to a lookup by an
-- already-public, non-sensitive unique key (slug), never a listing.
DROP POLICY tenant_isolation ON "organizations";
CREATE POLICY tenant_isolation ON "organizations"
  USING (
    id = current_setting('app.current_org_id', true)::text
    OR current_setting('app.is_platform_admin', true) = 'true'
    OR current_setting('app.public_registration', true) = 'true'
  );
