CREATE TABLE "site_visits" (
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
);

CREATE UNIQUE INDEX "site_visits_sessionId_key" ON "site_visits"("sessionId");
CREATE INDEX "site_visits_createdAt_idx" ON "site_visits"("createdAt");
CREATE INDEX "site_visits_visitorId_idx" ON "site_visits"("visitorId");
CREATE INDEX "site_visits_userId_idx" ON "site_visits"("userId");

ALTER TABLE "site_visits"
ADD CONSTRAINT "site_visits_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
