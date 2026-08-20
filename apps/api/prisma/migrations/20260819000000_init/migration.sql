-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLATFORM_ADMIN', 'ORG_ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD', 'FELLOWSHIP_LEADER', 'VOLUNTEER', 'MEMBER');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('GROWTH', 'HERITAGE', 'EMBER', 'REGAL', 'SLATE');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "theme" "Theme" NOT NULL DEFAULT 'GROWTH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "branchId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "branches_organizationId_idx" ON "branches"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =========================================================================
-- Row-level security (Section 5 / Section 13 of the blueprint)
--
-- Two session GUCs are set per request by the API (see src/prisma/tenant.ts):
--   app.current_org_id     -- the acting user's organizationId, or unset
--   app.is_platform_admin  -- 'true' only for the platform-admin-only routes
--                              that manage the organizations/branches/users
--                              *identity* tables themselves.
--
-- Deliberately NOT propagated to future ministry-data tables (members,
-- attendance, giving, pastoral notes, ...): Platform Administrators have no
-- default access to tenant data (Section 6). Any future support access to
-- that data must be its own logged, time-boxed break-glass path, not a
-- variant of this bypass flag.
-- =========================================================================

ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "organizations"
  USING (
    id = current_setting('app.current_org_id', true)::text
    OR current_setting('app.is_platform_admin', true) = 'true'
  );

ALTER TABLE "branches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "branches" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "branches"
  USING (
    "organizationId" = current_setting('app.current_org_id', true)::text
    OR current_setting('app.is_platform_admin', true) = 'true'
  );

-- users additionally allows organizationId IS NULL through: that's what a
-- Platform Administrator's own account looks like, and it's also the row
-- shape the login endpoint must be able to find by email before any org
-- context exists yet for the request.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "users"
  USING (
    "organizationId" = current_setting('app.current_org_id', true)::text
    OR current_setting('app.is_platform_admin', true) = 'true'
    OR "organizationId" IS NULL
  );

-- =========================================================================
-- Runtime grants for the restricted app role (see db/init/01-app-role.sql).
-- This migration itself runs as the superuser bootstrap role; the running
-- API connects as life_mmp_app, which is subject to the policies above.
-- =========================================================================
GRANT USAGE ON SCHEMA public TO life_mmp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO life_mmp_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO life_mmp_app;
