// Script pour corriger les statuts et rôles dans la base Prisma
// Placez ce fichier dans backend/scripts/fixUsers.js puis lancez : node scripts/fixUsers.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Mettre tous les PRO en PENDING (pour test validation admin)
  await prisma.user.updateMany({
    where: { role: 'PRO' },
    data: { status: 'PENDING' }
  });

  // Mettre tous les CLIENT en APPROVED
  await prisma.user.updateMany({
    where: { role: 'CLIENT' },
    data: { status: 'APPROVED' }
  });

  // Mettre tous les ADMIN en APPROVED
  await prisma.user.updateMany({
    where: { role: 'ADMIN' },
    data: { status: 'APPROVED' }
  });

  // Mettre tous les SUPER_ADMIN en APPROVED
  await prisma.user.updateMany({
    where: { role: 'SUPER_ADMIN' },
    data: { status: 'APPROVED' }
  });

  console.log('✅ Statuts corrigés pour tous les utilisateurs.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
