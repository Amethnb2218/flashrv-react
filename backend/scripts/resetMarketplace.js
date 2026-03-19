const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const REQUIRED_CONFIRMATION = 'RESET_JOLOFERA_MARKETPLACE';
const shouldDeleteUsers = process.argv.includes('--with-users');

async function runDelete(label, action, summary) {
  const result = await action();
  const count = Number(result?.count || 0);
  summary.push({ label, count });
}

async function main() {
  if (process.env.RESET_CONFIRM !== REQUIRED_CONFIRMATION) {
    console.error('Reset annule: confirmation manquante.');
    console.error(`Definis RESET_CONFIRM=${REQUIRED_CONFIRMATION} pour continuer.`);
    console.error('Exemple PowerShell:');
    console.error(`$env:RESET_CONFIRM='${REQUIRED_CONFIRMATION}'; node scripts/resetMarketplace.js`);
    console.error('Ajoute --with-users pour supprimer aussi les comptes CLIENT/PRO.');
    process.exit(1);
  }

  const summary = [];

  await runDelete('notifications', () => prisma.notification.deleteMany({}), summary);
  await runDelete('push subscriptions', () => prisma.pushSubscription.deleteMany({}), summary);
  await runDelete('feedbacks', () => prisma.feedback.deleteMany({}), summary);
  await runDelete('chat messages', () => prisma.chatMessage.deleteMany({}), summary);
  await runDelete('payments', () => prisma.payment.deleteMany({}), summary);
  await runDelete('appointments', () => prisma.appointment.deleteMany({}), summary);
  await runDelete('reviews', () => prisma.review.deleteMany({}), summary);
  await runDelete('loyalty', () => prisma.loyalty.deleteMany({}), summary);
  await runDelete('order items', () => prisma.orderItem.deleteMany({}), summary);
  await runDelete('orders', () => prisma.order.deleteMany({}), summary);
  await runDelete('product images', () => prisma.productImage.deleteMany({}), summary);
  await runDelete('products', () => prisma.product.deleteMany({}), summary);
  await runDelete('service images', () => prisma.serviceImage.deleteMany({}), summary);
  await runDelete('services', () => prisma.service.deleteMany({}), summary);
  await runDelete('gallery images', () => prisma.galleryImage.deleteMany({}), summary);
  await runDelete('availability slots', () => prisma.availability.deleteMany({}), summary);
  await runDelete('coiffeur profiles', () => prisma.coiffeur.deleteMany({}), summary);
  await runDelete('opening hours', () => prisma.openingHour.deleteMany({}), summary);
  await runDelete('payment methods', () => prisma.salonPaymentMethod.deleteMany({}), summary);
  await runDelete('salon settings', () => prisma.salonSettings.deleteMany({}), summary);
  await runDelete('planning breaks', () => prisma.planningBreak.deleteMany({}), summary);
  await runDelete('planning exceptions', () => prisma.planningException.deleteMany({}), summary);
  await runDelete('planning holidays', () => prisma.planningHoliday.deleteMany({}), summary);
  await runDelete('staff members', () => prisma.staffMember.deleteMany({}), summary);
  await runDelete('promo codes', () => prisma.promoCode.deleteMany({}), summary);
  await runDelete('salons/boutiques', () => prisma.salon.deleteMany({}), summary);

  if (shouldDeleteUsers) {
    await runDelete(
      'users (CLIENT/PRO/SALON_OWNER)',
      () => prisma.user.deleteMany({ where: { role: { in: ['CLIENT', 'PRO', 'SALON_OWNER'] } } }),
      summary
    );
  }

  console.log('Reset marketplace termine.');
  summary.forEach((item) => {
    console.log(`- ${item.label}: ${item.count}`);
  });
}

main()
  .catch((error) => {
    console.error('Erreur reset marketplace:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
