// Script pour corriger tous les utilisateurs et les passer en PRO avec status PENDING
// Place ce fichier dans backend/scripts puis lance : node backend/scripts/fixAllUsersToPro.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.user.updateMany({
    data: {
      role: 'PRO',
      status: 'PENDING',
    },
  });
  console.log(`✅ Tous les utilisateurs sont maintenant PRO et en attente (PENDING). (${updated.count} modifiés)`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
