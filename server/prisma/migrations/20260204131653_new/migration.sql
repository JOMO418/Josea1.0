/*
  Warnings:

  - Made the column `verificationMethod` on table `Sale` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "verificationMethod" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Sale_verificationMethod_idx" ON "Sale"("verificationMethod");
