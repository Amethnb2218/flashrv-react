const webpush = require('web-push');
const prisma = require('../lib/prisma');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO = process.env.VAPID_MAILTO || 'mailto:contact@styleflow.me';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('Web Push VAPID configured');
} else {
  console.warn('VAPID keys not set — Web Push disabled');
}

/**
 * Send a push notification to all subscriptions of a given user.
 * Silently removes expired/invalid subscriptions (410 Gone).
 */
async function sendPushToUser(userId, { title, body, url, icon }) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return;

  const payload = JSON.stringify({
    title: title || 'StyleFlow',
    body: body || '',
    url: url || '/',
    icon: icon || '/favicon.svg',
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
        .catch(async (err) => {
          // 410 Gone or 404 = subscription expired, clean up
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
          throw err;
        })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  if (sent > 0) {
    console.log(`Push sent to ${sent}/${subs.length} device(s) for user ${userId}`);
  }
}

module.exports = { sendPushToUser, VAPID_PUBLIC_KEY };
