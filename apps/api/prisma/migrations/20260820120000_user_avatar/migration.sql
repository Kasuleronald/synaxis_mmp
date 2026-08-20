-- AlterTable
ALTER TABLE "users" ADD COLUMN "avatarAssetId" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatarAssetId_fkey" FOREIGN KEY ("avatarAssetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
