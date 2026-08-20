-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "memberNumberSeq" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "memberNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "members_organizationId_memberNumber_key" ON "members"("organizationId", "memberNumber");

-- Backfill: assign sequential numbers to members that predate this feature,
-- earliest-registered first, and bring each org's counter up to match so
-- the next auto-allocated number continues from there.
DO $$
DECLARE
  org_row RECORD;
  member_row RECORD;
  seq INT;
BEGIN
  FOR org_row IN SELECT id FROM organizations LOOP
    seq := 0;
    FOR member_row IN
      SELECT id FROM members
      WHERE "organizationId" = org_row.id AND "memberNumber" IS NULL
      ORDER BY "createdAt" ASC
    LOOP
      seq := seq + 1;
      UPDATE members SET "memberNumber" = lpad(seq::text, 4, '0') WHERE id = member_row.id;
    END LOOP;
    IF seq > 0 THEN
      UPDATE organizations SET "memberNumberSeq" = seq WHERE id = org_row.id;
    END IF;
  END LOOP;
END $$;
