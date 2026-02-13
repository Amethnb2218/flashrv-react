-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_loyalty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "salonId" TEXT,
    CONSTRAINT "loyalty_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "loyalty_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_loyalty" ("clientId", "createdAt", "id", "points", "updatedAt") SELECT "clientId", "createdAt", "id", "points", "updatedAt" FROM "loyalty";
DROP TABLE "loyalty";
ALTER TABLE "new_loyalty" RENAME TO "loyalty";
CREATE UNIQUE INDEX "loyalty_clientId_salonId_key" ON "loyalty"("clientId", "salonId");
CREATE TABLE "new_planning_breaks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "start" DATETIME NOT NULL,
    "end" DATETIME NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "salonId" TEXT,
    CONSTRAINT "planning_breaks_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_planning_breaks" ("createdAt", "end", "id", "label", "start", "updatedAt") SELECT "createdAt", "end", "id", "label", "start", "updatedAt" FROM "planning_breaks";
DROP TABLE "planning_breaks";
ALTER TABLE "new_planning_breaks" RENAME TO "planning_breaks";
CREATE TABLE "new_planning_exceptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "salonId" TEXT,
    CONSTRAINT "planning_exceptions_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_planning_exceptions" ("createdAt", "date", "id", "reason", "updatedAt") SELECT "createdAt", "date", "id", "reason", "updatedAt" FROM "planning_exceptions";
DROP TABLE "planning_exceptions";
ALTER TABLE "new_planning_exceptions" RENAME TO "planning_exceptions";
CREATE TABLE "new_planning_holidays" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "salonId" TEXT,
    CONSTRAINT "planning_holidays_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_planning_holidays" ("createdAt", "date", "id", "label", "updatedAt") SELECT "createdAt", "date", "id", "label", "updatedAt" FROM "planning_holidays";
DROP TABLE "planning_holidays";
ALTER TABLE "new_planning_holidays" RENAME TO "planning_holidays";
CREATE TABLE "new_promo_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" DATETIME,
    "validTo" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "salonId" TEXT,
    CONSTRAINT "promo_codes_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_promo_codes" ("code", "createdAt", "description", "discount", "id", "isActive", "type", "updatedAt", "validFrom", "validTo") SELECT "code", "createdAt", "description", "discount", "id", "isActive", "type", "updatedAt", "validFrom", "validTo" FROM "promo_codes";
DROP TABLE "promo_codes";
ALTER TABLE "new_promo_codes" RENAME TO "promo_codes";
CREATE UNIQUE INDEX "promo_codes_salonId_code_key" ON "promo_codes"("salonId", "code");
CREATE TABLE "new_staff_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "salonId" TEXT,
    CONSTRAINT "staff_members_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_staff_members" ("createdAt", "email", "id", "isActive", "name", "phone", "role", "updatedAt") SELECT "createdAt", "email", "id", "isActive", "name", "phone", "role", "updatedAt" FROM "staff_members";
DROP TABLE "staff_members";
ALTER TABLE "new_staff_members" RENAME TO "staff_members";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
