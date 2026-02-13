UPDATE "salons"
SET "status" = 'APPROVED'
WHERE "ownerId" IN (
  SELECT "id" FROM "users"
  WHERE "status" = 'APPROVED'
    AND "role" IN ('PRO','SALON_OWNER')
);

UPDATE "salons"
SET "status" = 'PENDING'
WHERE "ownerId" IS NULL
   OR "ownerId" NOT IN (
     SELECT "id" FROM "users"
     WHERE "status" = 'APPROVED'
       AND "role" IN ('PRO','SALON_OWNER')
   );

DELETE FROM "salons"
WHERE "name" = 'Mon Salon'
  AND ("description" = 'Bienvenue dans mon salon' OR "description" IS NULL)
  AND ("address" IS NULL OR "address" LIKE '%définir%' OR "address" LIKE '%definir%');
