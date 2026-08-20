-- CreateTable
CREATE TABLE "fellowship_reports" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fellowshipId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "attendanceCount" INTEGER NOT NULL,
    "notes" TEXT,
    "givingAmount" DECIMAL(14,2),
    "expensesAmount" DECIMAL(14,2),
    "expenseNotes" TEXT,
    "currency" TEXT,
    "categoryId" TEXT,
    "financeStatus" "DeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "financeReviewedById" TEXT,
    "financeReviewedAt" TIMESTAMP(3),
    "financeNote" TEXT,
    "givingRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fellowship_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fellowship_report_attendees" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "fellowship_report_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fellowship_reports_givingRecordId_key" ON "fellowship_reports"("givingRecordId");

-- CreateIndex
CREATE INDEX "fellowship_reports_organizationId_idx" ON "fellowship_reports"("organizationId");

-- CreateIndex
CREATE INDEX "fellowship_reports_fellowshipId_idx" ON "fellowship_reports"("fellowshipId");

-- CreateIndex
CREATE UNIQUE INDEX "fellowship_report_attendees_reportId_memberId_key" ON "fellowship_report_attendees"("reportId", "memberId");

-- AddForeignKey
ALTER TABLE "fellowship_reports" ADD CONSTRAINT "fellowship_reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellowship_reports" ADD CONSTRAINT "fellowship_reports_fellowshipId_fkey" FOREIGN KEY ("fellowshipId") REFERENCES "fellowships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellowship_reports" ADD CONSTRAINT "fellowship_reports_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellowship_reports" ADD CONSTRAINT "fellowship_reports_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "giving_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellowship_reports" ADD CONSTRAINT "fellowship_reports_financeReviewedById_fkey" FOREIGN KEY ("financeReviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellowship_reports" ADD CONSTRAINT "fellowship_reports_givingRecordId_fkey" FOREIGN KEY ("givingRecordId") REFERENCES "giving_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellowship_report_attendees" ADD CONSTRAINT "fellowship_report_attendees_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "fellowship_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellowship_report_attendees" ADD CONSTRAINT "fellowship_report_attendees_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS -- ministry-data tables, no platform-admin bypass (Section 6).
ALTER TABLE "fellowship_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fellowship_reports" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "fellowship_reports"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

-- fellowship_report_attendees has no organizationId of its own -- scoped via
-- an EXISTS subquery against its parent report, same technique already used
-- for asset_condition_photos.
ALTER TABLE "fellowship_report_attendees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fellowship_report_attendees" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "fellowship_report_attendees"
  USING (EXISTS (
    SELECT 1 FROM "fellowship_reports"
    WHERE "fellowship_reports"."id" = "fellowship_report_attendees"."reportId"
      AND "fellowship_reports"."organizationId" = current_setting('app.current_org_id', true)::text
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON "fellowship_reports", "fellowship_report_attendees" TO life_mmp_app;
