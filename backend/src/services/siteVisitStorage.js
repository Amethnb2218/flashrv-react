const prisma = require('../lib/prisma');

let siteVisitStoragePromise = null;

function isSiteVisitStorageError(error) {
  return error?.code === 'P2021' || error?.code === 'P2022';
}

async function createSiteVisitStorage() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "site_visits" (
      "id" TEXT NOT NULL,
      "visitorId" TEXT NOT NULL,
      "sessionId" TEXT NOT NULL,
      "path" TEXT,
      "referrer" TEXT,
      "userAgent" TEXT,
      "ipHash" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "userId" TEXT,
      CONSTRAINT "site_visits_pkey" PRIMARY KEY ("id")
    )
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "site_visits"
    ADD COLUMN IF NOT EXISTS "path" TEXT,
    ADD COLUMN IF NOT EXISTS "referrer" TEXT,
    ADD COLUMN IF NOT EXISTS "userAgent" TEXT,
    ADD COLUMN IF NOT EXISTS "ipHash" TEXT,
    ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "userId" TEXT
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "site_visits_sessionId_key"
    ON "site_visits"("sessionId")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "site_visits_createdAt_idx"
    ON "site_visits"("createdAt")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "site_visits_visitorId_idx"
    ON "site_visits"("visitorId")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "site_visits_userId_idx"
    ON "site_visits"("userId")
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'site_visits_userId_fkey'
      ) THEN
        ALTER TABLE "site_visits"
        ADD CONSTRAINT "site_visits_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
}

async function ensureSiteVisitStorage() {
  if (!siteVisitStoragePromise) {
    siteVisitStoragePromise = createSiteVisitStorage().catch((error) => {
      siteVisitStoragePromise = null;
      throw error;
    });
  }

  return siteVisitStoragePromise;
}

module.exports = {
  ensureSiteVisitStorage,
  isSiteVisitStorageError,
};
