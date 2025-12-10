/*
  Warnings:

  - You are about to drop the column `address` on the `branches` table. All the data in the column will be lost.
  - You are about to drop the column `localContact` on the `branches` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "branches" DROP COLUMN "address",
DROP COLUMN "localContact";
