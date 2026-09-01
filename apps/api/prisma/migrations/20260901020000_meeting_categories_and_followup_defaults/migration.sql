-- CreateTable
CREATE TABLE "meeting_categories" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meeting_categories_organizationId_idx" ON "meeting_categories"("organizationId");

-- AddForeignKey
ALTER TABLE "meeting_categories" ADD CONSTRAINT "meeting_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS -- strict tenant-only, same shape as events/attendance_sessions.
ALTER TABLE "meeting_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meeting_categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "meeting_categories"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON "meeting_categories" TO scholars_life_mmp_app;

-- AlterTable
ALTER TABLE "events" ADD COLUMN "categoryId" TEXT;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "meeting_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "attendance_sessions" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "attendance_sessions_categoryId_idx" ON "attendance_sessions"("categoryId");

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "meeting_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "members" ADD COLUMN "originatedAsWalkIn" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "isDefaultFollowUpUser" BOOLEAN NOT NULL DEFAULT false;
