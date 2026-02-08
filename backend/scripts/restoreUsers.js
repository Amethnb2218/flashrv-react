// Script pour restaurer les rôles et statuts d'origine pour chaque utilisateur (exemple basé sur tes données initiales)
// Place ce fichier dans backend/scripts puis lance : node backend/scripts/restoreUsers.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Tableau d'exemple à adapter selon tes vrais utilisateurs
  const users = [
    { email: 'mouhamedsall4@esp.sn', role: 'PRO', status: 'PENDING' },
    { email: 'mouhalass04@gmail.com', role: 'PRO', status: 'PENDING' },
    { email: 'momolass2204@gmail.com', role: 'CLIENT', status: 'APPROVED' },
    { email: 'sallmouhamed2218@gmail.com', role: 'PRO', status: 'PENDING' },
    { email: 'meth19momo@gmail.com', role: 'ADMIN', status: 'APPROVED' },
    { email: 'ameths12218@gmail.com', role: 'SUPER_ADMIN', status: 'APPROVED' },
    { email: 'mouhamed26.sall@gmail.com', role: 'CLIENT', status: 'APPROVED' },
  ];

  for (const u of users) {
    await prisma.user.updateMany({
      where: { email: u.email },
      data: { role: u.role, status: u.status },
    });
  }
  console.log('✅ Rôles et statuts restaurés pour tous les utilisateurs.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
