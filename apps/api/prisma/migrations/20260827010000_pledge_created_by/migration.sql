-- AlterTable
ALTER TABLE "pledges" ADD COLUMN "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
