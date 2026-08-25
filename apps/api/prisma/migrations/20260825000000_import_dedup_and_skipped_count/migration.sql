-- AlterTable
ALTER TABLE "import_batches" ADD COLUMN "skippedRowCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "import_staging_rows" ADD COLUMN "duplicateOfRowIndex" INTEGER;
ALTER TABLE "import_staging_rows" ADD COLUMN "duplicateReason" TEXT;
