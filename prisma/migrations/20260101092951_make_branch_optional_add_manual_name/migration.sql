-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "manualBranchName" TEXT,
ALTER COLUMN "branchId" DROP NOT NULL;
