const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { VAPID_PUBLIC_KEY } = require('../services/pushService');

/**
 * GET /api/push/vapid-public-key
 * Returns the public VAPID key so the frontend can subscribe.
 */
router.get('/vapid-public-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({ status: 'error', message: 'Push not configured' });
  }
  res.json({ key: VAPID_PUBLIC_KEY });
});

/**
 * POST /api/push/subscribe
 * Stores a push subscription for the authenticated user.
 * Body: { endpoint, keys: { p256dh, auth } }
 */
router.post('/subscribe', authenticate, async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ status: 'error', message: 'Invalid subscription object' });
  }

  await prisma.pushSubscription.upsert({
    where: {
      userId_endpoint: { userId: req.user.id, endpoint },
    },
    update: { p256dh: keys.p256dh, auth: keys.auth },
    create: {
      userId: req.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  res.json({ status: 'success' });
});

/**
 * POST /api/push/unsubscribe
 * Removes a push subscription.
 * Body: { endpoint }
 */
router.post('/unsubscribe', authenticate, async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) {
    return res.status(400).json({ status: 'error', message: 'Endpoint required' });
  }

  await prisma.pushSubscription.deleteMany({
    where: { userId: req.user.id, endpoint },
  });

  res.json({ status: 'success' });
});

module.exports = router;
