const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const approvePro = await prisma.user.updateMany({
    where: { role: 'PRO' },
    data: { status: 'APPROVED', isPublic: true },
  });

  const approveLegacySalonOwner = await prisma.user.updateMany({
    where: { role: 'SALON_OWNER' },
    data: { status: 'APPROVED', isPublic: true },
  });

  const owners = await prisma.user.findMany({
    where: {
      status: 'APPROVED',
      role: { in: ['PRO', 'SALON_OWNER'] },
    },
    select: { id: true },
  });
  const ownerIds = owners.map((owner) => owner.id);

  const approveSalons = ownerIds.length
    ? await prisma.salon.updateMany({
      where: { ownerId: { in: ownerIds } },
      data: { status: 'APPROVED', isOpen: true },
    })
    : { count: 0 };

  console.log('Publication salons/boutiques terminee.');
  console.log(`- Utilisateurs PRO approuves: ${approvePro.count}`);
  console.log(`- Utilisateurs SALON_OWNER approuves: ${approveLegacySalonOwner.count}`);
  console.log(`- Salons/Boutiques publies: ${approveSalons.count}`);
}

main()
  .catch((error) => {
    console.error('Erreur publication salons:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
