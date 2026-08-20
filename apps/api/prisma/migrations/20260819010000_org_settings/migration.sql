-- AlterTable: church profile settings (Settings screen, Org Admin only)
ALTER TABLE "organizations"
  ADD COLUMN "country" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'UGX';
