-- CreateEnum
CREATE TYPE "MpesaVerificationStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'VERIFIED', 'FAILED');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "flaggedForVerification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mpesaReceiptNumber" TEXT,
ADD COLUMN     "mpesaVerificationStatus" "MpesaVerificationStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
ADD COLUMN     "verificationNotes" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedBy" TEXT;

-- CreateIndex
CREATE INDEX "Sale_flaggedForVerification_idx" ON "Sale"("flaggedForVerification");

-- CreateIndex
CREATE INDEX "Sale_mpesaVerificationStatus_idx" ON "Sale"("mpesaVerificationStatus");
