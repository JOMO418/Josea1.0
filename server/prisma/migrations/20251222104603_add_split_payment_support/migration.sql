-- CreateTable: SalePayment for split payment support
CREATE TABLE "SalePayment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalePayment_saleId_idx" ON "SalePayment"("saleId");
CREATE INDEX "SalePayment_method_idx" ON "SalePayment"("method");
CREATE INDEX "SalePayment_createdAt_idx" ON "SalePayment"("createdAt");

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing paymentMethod data to SalePayment
-- For each existing sale, create a corresponding SalePayment record with the full amount
INSERT INTO "SalePayment" ("id", "saleId", "method", "amount", "createdAt")
SELECT
    gen_random_uuid()::text,
    id,
    "paymentMethod",
    total,
    "createdAt"
FROM "Sale"
WHERE "paymentMethod" IS NOT NULL;

-- DropColumn: paymentMethod from Sale (no longer needed)
ALTER TABLE "Sale" DROP COLUMN "paymentMethod";
