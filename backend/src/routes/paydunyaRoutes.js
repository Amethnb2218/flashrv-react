const express = require('express');
const prisma = require('../lib/prisma');
const { confirmPaydunyaInvoice } = require('../services/paydunyaService');
const { pushNotification } = require('../realtime/hub');

const router = express.Router();

const extractInvoiceToken = (payload = {}) => {
  return (
    payload?.token ||
    payload?.invoice_token ||
    payload?.data?.token ||
    payload?.data?.invoice_token ||
    payload?.invoice?.token ||
    null
  );
};

const extractRequesterToken = (req) => {
  return (
    req.get('paydunya-token') ||
    req.get('x-paydunya-token') ||
    req.body?.api_token ||
    req.body?.security_token ||
    null
  );
};

router.post('/ipn', async (req, res) => {
  try {
    const expectedToken = process.env.PAYDUNYA_TOKEN;
    const requesterToken = extractRequesterToken(req);
    if (expectedToken && requesterToken && requesterToken !== expectedToken) {
      return res.status(401).json({ status: 'error', message: 'Token IPN invalide' });
    }

    const token = extractInvoiceToken(req.body);
    if (!token) {
      return res.status(400).json({ status: 'error', message: 'Token facture manquant' });
    }

    const verification = await confirmPaydunyaInvoice(token);

    if (!verification.isPaid) {
      return res.status(200).json({ status: 'success', message: 'Paiement non finalise' });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [{ reference: token }, { transactionId: token }],
      },
    });

    if (!payment) {
      return res.status(404).json({ status: 'error', message: 'Paiement introuvable' });
    }

    if (String(payment.status || '').toUpperCase() === 'COMPLETED') {
      return res.status(200).json({ status: 'success', message: 'Paiement deja confirme' });
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'COMPLETED', completedAt: new Date(), transactionId: token },
    });

    if (updated.appointmentId) {
      await prisma.appointment.update({
        where: { id: updated.appointmentId },
        data: { status: 'PAID' },
      }).catch(() => {});
    }

    if (updated.userId) {
      try {
        const notification = await prisma.notification.create({
          data: {
            userId: updated.userId,
            type: 'payment',
            message: 'Paiement confirme pour votre reservation.',
          },
        });
        pushNotification(notification.userId, notification);
      } catch (error) {
        console.error('PayDunya IPN notification error:', error.message);
      }
    }

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('PayDunya IPN error:', error.message);
    return res.status(500).json({ status: 'error', message: 'Erreur traitement IPN' });
  }
});

module.exports = router;
