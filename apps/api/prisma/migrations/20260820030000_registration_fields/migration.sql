-- AlterTable
ALTER TABLE "self_registrations" ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "birthMonth" INTEGER,
ADD COLUMN     "birthDay" INTEGER,
ADD COLUMN     "birthYear" INTEGER,
ADD COLUMN     "maritalStatus" "MaritalStatus",
ADD COLUMN     "isStudent" BOOLEAN,
ADD COLUMN     "school" TEXT;
