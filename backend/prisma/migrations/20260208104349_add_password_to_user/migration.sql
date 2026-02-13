/*
  Warnings:

  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "username" TEXT,
  "phoneNumber" TEXT,
  "password" TEXT NOT NULL DEFAULT 'changeme',
  "googleSub" TEXT,
  "name" TEXT,
  "picture" TEXT,
  "role" TEXT NOT NULL DEFAULT 'CLIENT',
  "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "canCreateService" BOOLEAN NOT NULL DEFAULT true,
    "canBook" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "adminType" TEXT,
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("adminType", "canBook", "canCreateService", "createdAt", "email", "googleSub", "id", "isPublic", "isRestricted", "name", "phoneNumber", "picture", "role", "status", "updatedAt", "username", "password") SELECT "adminType", "canBook", "canCreateService", "createdAt", "email", "googleSub", "id", "isPublic", "isRestricted", "name", "phoneNumber", "picture", "role", "status", "updatedAt", "username", 'changeme' FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_googleSub_key" ON "users"("googleSub");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
