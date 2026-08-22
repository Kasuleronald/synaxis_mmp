-- CreateTable
CREATE TABLE "fixed_asset_photos" (
    "id" TEXT NOT NULL,
    "fixedAssetId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fixed_asset_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fixed_asset_photos_fixedAssetId_idx" ON "fixed_asset_photos"("fixedAssetId");

-- AddForeignKey
ALTER TABLE "fixed_asset_photos" ADD CONSTRAINT "fixed_asset_photos_fixedAssetId_fkey" FOREIGN KEY ("fixedAssetId") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_asset_photos" ADD CONSTRAINT "fixed_asset_photos_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- fixed_asset_photos has no organizationId of its own -- scoped via an
-- EXISTS subquery against its parent fixed asset, same technique already
-- used for requisition_receipts/asset_condition_photos/fellowship_report_attendees.
ALTER TABLE "fixed_asset_photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fixed_asset_photos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "fixed_asset_photos"
  USING (EXISTS (
    SELECT 1 FROM "fixed_assets"
    WHERE "fixed_assets"."id" = "fixed_asset_photos"."fixedAssetId"
      AND "fixed_assets"."organizationId" = current_setting('app.current_org_id', true)::text
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON "fixed_asset_photos" TO scholars_life_mmp_app;
