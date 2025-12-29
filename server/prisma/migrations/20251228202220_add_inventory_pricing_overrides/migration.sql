-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'DENI';

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "lowStockThreshold" INTEGER,
ADD COLUMN     "sellingPrice" DECIMAL(10,2);
