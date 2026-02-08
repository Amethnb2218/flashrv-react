-- CreateTable
CREATE TABLE "salon_payment_methods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salonId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "salon_payment_methods_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "salon_payment_methods_salonId_method_key" ON "salon_payment_methods"("salonId", "method");
