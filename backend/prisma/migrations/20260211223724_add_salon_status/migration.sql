-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_salons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "image" TEXT,
    "rating" REAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "salonType" TEXT NOT NULL DEFAULT 'mixte',
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT,
    CONSTRAINT "salons_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_salons" ("address", "city", "createdAt", "description", "email", "id", "image", "isOpen", "name", "ownerId", "phone", "rating", "reviewCount", "salonType", "updatedAt") SELECT "address", "city", "createdAt", "description", "email", "id", "image", "isOpen", "name", "ownerId", "phone", "rating", "reviewCount", "salonType", "updatedAt" FROM "salons";
DROP TABLE "salons";
ALTER TABLE "new_salons" RENAME TO "salons";
CREATE UNIQUE INDEX "salons_ownerId_key" ON "salons"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
