-- AddMpesaVerificationTracking
-- Add fields for complete M-Pesa verification tracking

-- Add verification method enum
CREATE TYPE "VerificationMethod" AS ENUM ('AUTOMATIC', 'MANUAL_MANAGER', 'MANUAL_ADMIN', 'NOT_VERIFIED');

-- Add new columns to Sale table
ALTER TABLE "Sale" ADD COLUMN "verificationMethod" "VerificationMethod" DEFAULT 'NOT_VERIFIED';
ALTER TABLE "Sale" ADD COLUMN "flaggedAt" TIMESTAMP(3);

-- Add index for efficient querying of flagged sales
CREATE INDEX "Sale_flaggedAt_idx" ON "Sale"("flaggedAt");

-- Add comment for documentation
COMMENT ON COLUMN "Sale"."verificationMethod" IS 'How the M-Pesa payment was verified: AUTOMATIC (via callback), MANUAL_MANAGER (manager entered code), MANUAL_ADMIN (admin override), NOT_VERIFIED (not yet verified)';
COMMENT ON COLUMN "Sale"."flaggedAt" IS 'Timestamp when sale was flagged for verification (Complete Later button pressed)';
