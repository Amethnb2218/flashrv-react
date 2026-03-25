const crypto = require('crypto');
const express = require('express');
const prisma = require('../lib/prisma');
const { getPaytechConfig } = require('../services/paytechService');
const { pushNotification } = require('../realtime/hub');
const { sendBookingConfirmationEmail, sendOrderConfirmationEmail } = require('../services/emailService');

const router = express.Router();

const decodeCustomField = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return {};

  const attempts = [raw];
  try {
    attempts.push(Buffer.from(raw, 'base64').toString('utf8'));
  } catch (_) {}

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (_) {}
  }

  return {};
};

const verifyPaytechIpn = (body) => {
  const config = getPaytechConfig();
  const apiKeyHash = String(body?.api_key_sha256 || '').trim().toLowerCase();
  const apiSecretHash = String(body?.api_secret_sha256 || '').trim().toLowerCase();
  const hmac = String(body?.hmac_compute || '').trim().toLowerCase();
  const itemPrice = String(body?.final_item_price || body?.item_price || '').trim();
  const refCommand = String(body?.ref_command || '').trim();

  if (hmac && itemPrice && refCommand) {
    const message = `${itemPrice}|${refCommand}|${config.apiKey}`;
    const expectedHmac = crypto.createHmac('sha256', config.apiSecret).update(message).digest('hex').toLowerCase();
    return expectedHmac === hmac;
  }

  const expectedApiKeyHash = crypto.createHash('sha256').update(config.apiKey).digest('hex').toLowerCase();
  const expectedApiSecretHash = crypto.createHash('sha256').update(config.apiSecret).digest('hex').toLowerCase();
  return expectedApiKeyHash === apiKeyHash && expectedApiSecretHash === apiSecretHash;
};

router.post('/ipn', async (req, res) => {
  try {
    if (!verifyPaytechIpn(req.body || {})) {
      return res.status(403).json({ status: 'error', message: 'Notification PayTech non authentifiee' });
    }

    const typeEvent = String(req.body?.type_event || '').trim().toLowerCase();
    const token = String(req.body?.token || '').trim();
    const refCommand = String(req.body?.ref_command || '').trim();

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [{ reference: refCommand }, { transactionId: token }],
      },
    });

    if (!payment) {
      return res.status(404).json({ status: 'error', message: 'Paiement introuvable' });
    }

    if (typeEvent === 'sale_canceled') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'CANCELLED', transactionId: token || payment.transactionId },
      }).catch(() => {});
      return res.status(200).json({ status: 'success', message: 'Paiement annule' });
    }

    if (typeEvent !== 'sale_complete') {
      return res.status(200).json({ status: 'success', message: 'Evenement ignore' });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        transactionId: token || payment.transactionId,
      },
      include: {
        appointment: {
          include: {
            salon: { select: { name: true } },
            client: { select: { name: true, email: true } },
            service: { select: { name: true, price: true } },
          },
        },
        order: {
          include: {
            salon: { select: { name: true } },
            client: { select: { name: true, email: true } },
            items: { include: { product: { select: { name: true, price: true } } } },
          },
        },
      },
    });

    if (updatedPayment.appointmentId) {
      await prisma.appointment.update({
        where: { id: updatedPayment.appointmentId },
        data: { status: 'PAID' },
      }).catch(() => {});
    }
    if (updatedPayment.orderId) {
      await prisma.order.update({
        where: { id: updatedPayment.orderId },
        data: { status: 'CONFIRMED' },
      }).catch(() => {});
    }

    if (updatedPayment.userId) {
      const message = updatedPayment.appointment
        ? 'Paiement PayTech confirme pour votre reservation.'
        : updatedPayment.order
          ? 'Paiement PayTech confirme pour votre commande.'
          : 'Paiement PayTech confirme avec succes.';
      const notification = await prisma.notification.create({
        data: {
          userId: updatedPayment.userId,
          type: 'payment',
          message,
        },
      }).catch(() => null);
      if (notification) {
        pushNotification(notification.userId, notification);
      }
    }

    if (updatedPayment.appointment?.client?.email) {
      sendBookingConfirmationEmail({
        to: updatedPayment.appointment.client.email,
        clientName: updatedPayment.appointment.client.name || 'Client',
        salonName: updatedPayment.appointment.salon?.name || 'le salon',
        date: updatedPayment.appointment.date,
        time: updatedPayment.appointment.startTime,
        services: updatedPayment.appointment.service ? [updatedPayment.appointment.service] : [],
        totalPrice: updatedPayment.appointment.totalPrice || updatedPayment.amount || 0,
      }).catch(() => {});
    }

    if (updatedPayment.order?.client?.email) {
      sendOrderConfirmationEmail({
        to: updatedPayment.order.client.email,
        clientName: updatedPayment.order.clientName || updatedPayment.order.client.name || 'Client',
        boutiqueName: updatedPayment.order.salon?.name || 'la boutique',
        items: updatedPayment.order.items || [],
        totalPrice: updatedPayment.order.totalPrice || updatedPayment.amount || 0,
        deliveryMode: updatedPayment.order.deliveryMode,
      }).catch(() => {});
    }

    return res.status(200).json({ status: 'success', data: decodeCustomField(req.body?.custom_field) });
  } catch (error) {
    console.error('PayTech IPN error:', error.message);
    return res.status(500).json({ status: 'error', message: 'Erreur traitement IPN PayTech' });
  }
});

module.exports = router;
