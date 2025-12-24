-- CreateEnum
CREATE TYPE "ReversalStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "isWalkIn" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reversalStatus" "ReversalStatus" NOT NULL DEFAULT 'NONE';

-- CreateIndex
CREATE INDEX "Sale_reversalStatus_idx" ON "Sale"("reversalStatus");
