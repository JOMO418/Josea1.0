-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "lastRestockAt" TIMESTAMP(3),
ADD COLUMN     "lastSoldAt" TIMESTAMP(3);
