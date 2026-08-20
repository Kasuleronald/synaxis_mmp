-- CreateTable
CREATE TABLE "fixed_asset_edit_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fixedAssetId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "proposedChanges" JSONB NOT NULL,
    "note" TEXT,
    "status" "DeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fixed_asset_edit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fixed_asset_edit_requests_organizationId_idx" ON "fixed_asset_edit_requests"("organizationId");

-- CreateIndex
CREATE INDEX "fixed_asset_edit_requests_fixedAssetId_idx" ON "fixed_asset_edit_requests"("fixedAssetId");

-- AddForeignKey
ALTER TABLE "fixed_asset_edit_requests" ADD CONSTRAINT "fixed_asset_edit_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_asset_edit_requests" ADD CONSTRAINT "fixed_asset_edit_requests_fixedAssetId_fkey" FOREIGN KEY ("fixedAssetId") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_asset_edit_requests" ADD CONSTRAINT "fixed_asset_edit_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_asset_edit_requests" ADD CONSTRAINT "fixed_asset_edit_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS -- ministry-data table, no platform-admin bypass (Section 6).
ALTER TABLE "fixed_asset_edit_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fixed_asset_edit_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "fixed_asset_edit_requests"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON "fixed_asset_edit_requests" TO scholars_life_mmp_app;
