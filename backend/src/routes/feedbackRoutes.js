const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { optionalAuth } = require('../middleware/auth');
const { pushNotification } = require('../realtime/hub');

const router = express.Router();
const prisma = new PrismaClient();

const ALLOWED_TYPES = new Set(['bug', 'suggestion', 'problem']);

router.post('/', optionalAuth, async (req, res) => {
  try {
    const { type, payload, contact } = req.body || {};
    const normalizedType = String(type || '').toLowerCase();

    if (!ALLOWED_TYPES.has(normalizedType)) {
      return res.status(400).json({ status: 'error', message: 'Type de feedback invalide.' });
    }

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ status: 'error', message: 'Contenu du feedback invalide.' });
    }

    let payloadString = '';
    try {
      payloadString = JSON.stringify(payload);
    } catch (e) {
      return res.status(400).json({ status: 'error', message: 'Payload non sérialisable.' });
    }

    const created = await prisma.feedback.create({
      data: {
        type: normalizedType,
        payload: payloadString,
        contact: contact ? String(contact).trim() : null,
        userId: req.user?.id || null,
      },
    });

    if (normalizedType === 'suggestion') {
      try {
        let ownerId = null;
        const payloadSalonId = payload?.salonId ? String(payload.salonId) : '';
        if (payloadSalonId) {
          const salon = await prisma.salon.findUnique({
            where: { id: payloadSalonId },
            select: { ownerId: true },
          });
          ownerId = salon?.ownerId || null;
        }
        if (!ownerId && req.user?.id) {
          const lastAppointment = await prisma.appointment.findFirst({
            where: { clientId: req.user.id },
            orderBy: { createdAt: 'desc' },
            include: { salon: { select: { ownerId: true } } },
          });
          ownerId = lastAppointment?.salon?.ownerId || null;
        }
        if (ownerId && ownerId !== req.user?.id) {
          const notification = await prisma.notification.create({
            data: {
              userId: ownerId,
              type: 'suggestion',
              message: 'Un client a envoyé une suggestion à propos de votre salon.',
            },
          });
          pushNotification(notification.userId, notification);
        }
      } catch (e) {
        console.error('Suggestion notification error:', e.message);
      }
    }

    return res.status(201).json({ status: 'success', data: created });
  } catch (error) {
    console.error('Erreur feedback:', error);
    return res.status(500).json({ status: 'error', message: 'Impossible d’enregistrer le feedback.' });
  }
});

module.exports = router;
