-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "businessDetails" TEXT,
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "conversionChance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "initialNotes" TEXT,
ADD COLUMN     "inquiryDate" TIMESTAMP(3),
ADD COLUMN     "revenueAmount" DOUBLE PRECISION,
ADD COLUMN     "serviceName" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_tenantId_name_key" ON "services"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
