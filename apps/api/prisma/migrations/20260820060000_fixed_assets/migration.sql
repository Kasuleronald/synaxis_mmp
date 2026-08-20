-- CreateEnum
CREATE TYPE "FixedAssetCategory" AS ENUM ('LAND', 'BUILDING', 'EQUIPMENT', 'VEHICLE', 'FURNITURE', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'NEEDS_REPAIR', 'DISPOSED');

-- CreateEnum
CREATE TYPE "ConditionRequestStatus" AS ENUM ('PENDING', 'RESPONDED');

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "category" "FixedAssetCategory" NOT NULL,
    "description" TEXT,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "acquisitionCost" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "depreciationRatePercent" DOUBLE PRECISION,
    "conditionAtAcquisition" "AssetCondition" NOT NULL,
    "currentCondition" "AssetCondition" NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_condition_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fixedAssetId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "message" TEXT,
    "status" "ConditionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedById" TEXT,
    "responseCondition" "AssetCondition",
    "responseDescription" TEXT,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "asset_condition_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_condition_photos" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "asset_condition_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fixed_assets_organizationId_idx" ON "fixed_assets"("organizationId");

-- CreateIndex
CREATE INDEX "fixed_assets_branchId_idx" ON "fixed_assets"("branchId");

-- CreateIndex
CREATE INDEX "asset_condition_requests_organizationId_idx" ON "asset_condition_requests"("organizationId");

-- CreateIndex
CREATE INDEX "asset_condition_requests_fixedAssetId_idx" ON "asset_condition_requests"("fixedAssetId");

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_condition_requests" ADD CONSTRAINT "asset_condition_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_condition_requests" ADD CONSTRAINT "asset_condition_requests_fixedAssetId_fkey" FOREIGN KEY ("fixedAssetId") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_condition_requests" ADD CONSTRAINT "asset_condition_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_condition_requests" ADD CONSTRAINT "asset_condition_requests_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_condition_photos" ADD CONSTRAINT "asset_condition_photos_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "asset_condition_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_condition_photos" ADD CONSTRAINT "asset_condition_photos_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS -- ministry-data tables, no platform-admin bypass (Section 6).
ALTER TABLE "fixed_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fixed_assets" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "fixed_assets"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "asset_condition_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_condition_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "asset_condition_requests"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

-- asset_condition_photos has no organizationId of its own -- it's a pure
-- join row, always reached through its parent request, which is already
-- tenant-isolated. RLS still applies via that FK relationship at the
-- application layer (every query goes through the parent request first).
ALTER TABLE "asset_condition_photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_condition_photos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "asset_condition_photos"
  USING (EXISTS (
    SELECT 1 FROM "asset_condition_requests" r
    WHERE r.id = "asset_condition_photos"."requestId"
      AND r."organizationId" = current_setting('app.current_org_id', true)::text
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON "fixed_assets", "asset_condition_requests", "asset_condition_photos" TO scholars_life_mmp_app;
