const express = require('express');
const prisma = require('../lib/prisma');
const { confirmPaydunyaInvoice } = require('../services/paydunyaService');
const { pushNotification } = require('../realtime/hub');
const { sendBookingConfirmationEmail, sendOrderConfirmationEmail } = require('../services/emailService');

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

    let appointment = null;
    let order = null;
    if (updated.appointmentId) {
      appointment = await prisma.appointment.findUnique({
        where: { id: updated.appointmentId },
        include: {
          salon: { select: { name: true } },
          client: { select: { name: true, email: true } },
          service: { select: { name: true, price: true } },
        },
      }).catch(() => null);
      await prisma.appointment.update({
        where: { id: updated.appointmentId },
        data: { status: 'PAID' },
      }).catch(() => {});
    }
    if (updated.orderId) {
      order = await prisma.order.findUnique({
        where: { id: updated.orderId },
        include: {
          salon: { select: { name: true } },
          client: { select: { name: true, email: true } },
          items: { include: { product: { select: { name: true, price: true } } } },
        },
      }).catch(() => null);
      await prisma.order.update({
        where: { id: updated.orderId },
        data: { status: 'CONFIRMED' },
      }).catch(() => {});
    }

    if (updated.userId) {
      try {
        const message = appointment
          ? 'Paiement confirme pour votre reservation.'
          : order
            ? 'Paiement confirme pour votre commande.'
            : 'Paiement confirme avec succes.';
        const notification = await prisma.notification.create({
          data: {
            userId: updated.userId,
            type: 'payment',
            message,
          },
        });
        pushNotification(notification.userId, notification);
      } catch (error) {
        console.error('PayDunya IPN notification error:', error.message);
      }
    }

    if (appointment?.client?.email) {
      sendBookingConfirmationEmail({
        to: appointment.client.email,
        clientName: appointment.client.name || 'Client',
        salonName: appointment.salon?.name || 'le salon',
        date: appointment.date,
        time: appointment.startTime,
        services: appointment.service ? [appointment.service] : [],
        totalPrice: appointment.totalPrice || appointment.service?.price || updated.amount || 0,
      }).catch(() => {});
    }

    if (order?.client?.email) {
      sendOrderConfirmationEmail({
        to: order.client.email,
        clientName: order.clientName || order.client.name || 'Client',
        boutiqueName: order.salon?.name || 'la boutique',
        items: order.items || [],
        totalPrice: order.totalPrice || updated.amount || 0,
        deliveryMode: order.deliveryMode,
      }).catch(() => {});
    }

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('PayDunya IPN error:', error.message);
    return res.status(500).json({ status: 'error', message: 'Erreur traitement IPN' });
  }
});

module.exports = router;
