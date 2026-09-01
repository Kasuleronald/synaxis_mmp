-- AlterTable
ALTER TABLE "events" ADD COLUMN "recurrenceGroupId" TEXT;

-- CreateIndex
CREATE INDEX "events_recurrenceGroupId_idx" ON "events"("recurrenceGroupId");
