const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { sendPushToUser } = require('../services/pushService');

/**
 * Appointment reminder cron — runs every 15 minutes.
 * Sends a push notification ~1 hour before the appointment.
 */
function startReminderCron() {
  // Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Find today's appointments happening in ~1h (±15 min window)
      const appointments = await prisma.appointment.findMany({
        where: {
          date: today,
          status: { in: ['PENDING', 'CONFIRMED', 'PENDING_ASSIGNMENT'] },
          reminderSent: { not: true },
        },
        include: {
          salon: { select: { name: true } },
          service: { select: { name: true } },
          client: { select: { id: true, name: true } },
        },
      });

      for (const appt of appointments) {
        const [h, m] = (appt.startTime || '').split(':').map(Number);
        if (isNaN(h) || isNaN(m)) continue;
        const apptTime = new Date(today);
        apptTime.setHours(h, m, 0, 0);

        const diffMs = apptTime.getTime() - now.getTime();
        // Between 45 min and 75 min from now → send reminder
        if (diffMs > 45 * 60 * 1000 && diffMs <= 75 * 60 * 1000) {
          const salonName = appt.salon?.name || 'votre salon';
          const serviceName = appt.service?.name || 'votre service';

          await sendPushToUser(appt.clientId, {
            title: '⏰ Rappel rendez-vous',
            body: `Votre RDV "${serviceName}" chez ${salonName} est dans ~1h (${appt.startTime}).`,
            url: '/dashboard',
          });

          // Mark as reminded so we don't send again
          await prisma.appointment.update({
            where: { id: appt.id },
            data: { reminderSent: true },
          }).catch(() => {});

          console.log(`Reminder sent for appointment ${appt.id}`);
        }
      }
    } catch (err) {
      console.error('Reminder cron error:', err.message);
    }
  });

  console.log('Appointment reminder cron started (every 15 min)');
}

module.exports = { startReminderCron };
