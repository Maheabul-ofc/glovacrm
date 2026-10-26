-- CreateTable
CREATE TABLE "upgrade_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyName" TEXT NOT NULL,
    "industry" TEXT,
    "country" TEXT DEFAULT 'IN',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "planName" TEXT NOT NULL,
    "planPrice" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upgrade_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upgrade_requests_status_idx" ON "upgrade_requests"("status");

-- CreateIndex
CREATE INDEX "upgrade_requests_email_idx" ON "upgrade_requests"("email");
