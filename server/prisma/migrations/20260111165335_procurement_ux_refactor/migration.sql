/*
  Warnings:

  - Added the required column `expectedPrice` to the `ProcurementOrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderPriority" AS ENUM ('NORMAL', 'URGENT');

-- AlterTable
ALTER TABLE "ProcurementOrder" ADD COLUMN     "priority" "OrderPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "routeOrder" JSONB;

-- AlterTable
ALTER TABLE "ProcurementOrderItem" ADD COLUMN     "actualPrice" DECIMAL(10,2),
ADD COLUMN     "alternativeSupplierId" TEXT,
ADD COLUMN     "expectedPrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "isPurchased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "purchasedAt" TIMESTAMP(3),
ADD COLUMN     "workerNotes" TEXT;

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "procurementOrderId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "expectedAmount" DECIMAL(10,2) NOT NULL,
    "actualAmount" DECIMAL(10,2),
    "paymentStatus" "ProcurementPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" "PaymentMethod",
    "paidAt" TIMESTAMP(3),
    "receiptImageUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierPayment_procurementOrderId_idx" ON "SupplierPayment"("procurementOrderId");

-- CreateIndex
CREATE INDEX "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierPayment_paymentStatus_idx" ON "SupplierPayment"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_procurementOrderId_supplierId_key" ON "SupplierPayment"("procurementOrderId", "supplierId");

-- CreateIndex
CREATE INDEX "ProcurementOrder_priority_idx" ON "ProcurementOrder"("priority");

-- CreateIndex
CREATE INDEX "ProcurementOrderItem_isPurchased_idx" ON "ProcurementOrderItem"("isPurchased");

-- AddForeignKey
ALTER TABLE "ProcurementOrderItem" ADD CONSTRAINT "ProcurementOrderItem_alternativeSupplierId_fkey" FOREIGN KEY ("alternativeSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_procurementOrderId_fkey" FOREIGN KEY ("procurementOrderId") REFERENCES "ProcurementOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
