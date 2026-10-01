-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "colorHex" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "details" TEXT[] DEFAULT ARRAY[]::TEXT[];
