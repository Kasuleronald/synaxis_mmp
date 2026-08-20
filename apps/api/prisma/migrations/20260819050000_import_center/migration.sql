-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'EXTRACTING', 'READY_FOR_REVIEW', 'COMMITTED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMMITTED');

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "usedAi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_staging_rows" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "extractedFields" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "possibleDuplicateOfId" TEXT,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_staging_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_batches_organizationId_idx" ON "import_batches"("organizationId");

-- CreateIndex
CREATE INDEX "import_staging_rows_importBatchId_idx" ON "import_staging_rows"("importBatchId");

-- CreateIndex
CREATE INDEX "import_staging_rows_organizationId_idx" ON "import_staging_rows"("organizationId");

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_staging_rows" ADD CONSTRAINT "import_staging_rows_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS -- ministry-data tables, no platform-admin bypass (Section 6).
ALTER TABLE "import_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_batches" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "import_batches"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "import_staging_rows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_staging_rows" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "import_staging_rows"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON "import_batches", "import_staging_rows" TO life_mmp_app;
