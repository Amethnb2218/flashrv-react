const prisma = require('../lib/prisma');

const formatNotificationDate = (date) => {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return value.toLocaleDateString('fr-FR');
};

const deleteBookingNotificationsForSlot = async ({ userId, salonName, date, startTime }) => {
  const normalizedSalonName = String(salonName || '').trim();
  const formattedDate = formatNotificationDate(date);
  const normalizedTime = String(startTime || '').trim();

  if (!userId || !normalizedSalonName || !formattedDate || !normalizedTime) {
    return;
  }

  await prisma.notification.deleteMany({
    where: {
      userId,
      type: 'booking',
      AND: [
        { message: { contains: `chez ${normalizedSalonName}` } },
        { message: { contains: formattedDate } },
        { message: { contains: normalizedTime } },
      ],
    },
  });
};

const createBookingNotification = async ({ userId, salonName, date, startTime, message }) => {
  await deleteBookingNotificationsForSlot({ userId, salonName, date, startTime });

  return prisma.notification.create({
    data: {
      userId,
      type: 'booking',
      message,
    },
  });
};

module.exports = {
  createBookingNotification,
};
