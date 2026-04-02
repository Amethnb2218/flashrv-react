const express = require('express');
const prisma = require('../lib/prisma');
const { retrieveDexPayCheckoutByReference, getDexPayConfig } = require('../services/dexpayService');
const { pushNotification } = require('../realtime/hub');
const { sendBookingConfirmationEmail, sendOrderConfirmationEmail } = require('../services/emailService');
const { commitOrderStockIfNeeded } = require('../utils/orderStock');
const { triggerAutoPayoutForPayment } = require('../services/dexpayPayoutService');

const router = express.Router();

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();

const isWebhookAuthorized = (req) => {
  const expected = String(getDexPayConfig().webhookToken || '').trim();
  if (!expected) return true;
  const provided = String(req.query?.token || req.get('x-webhook-token') || '').trim();
  return Boolean(provided && provided === expected);
};

const buildWebhookResponse = (message) => ({ status: 'success', message });

const createUserNotification = async (userId, type, message) => {
  if (!userId || !message) return null;
  const notification = await prisma.notification.create({
    data: { userId, type, message },
  }).catch(() => null);
  if (notification) pushNotification(notification.userId, notification);
  return notification;
};

router.post('/webhook', async (req, res) => {
  try {
    if (!isWebhookAuthorized(req)) {
      return res.status(403).json({ status: 'error', message: 'Webhook DexPay non autorise' });
    }

    const eventType = String(req.body?.type || '').trim().toLowerCase();
    const eventData = req.body?.data || {};

    if (eventType === 'checkout.failed') {
      const failedReference = String(eventData?.reference || '').trim();
      if (failedReference) {
        await prisma.payment.updateMany({
          where: { reference: failedReference },
          data: { status: 'FAILED' },
        }).catch(() => {});
      }
      return res.status(200).json(buildWebhookResponse('Checkout echec traite'));
    }

    if (eventType === 'checkout.completed') {
      const reference = String(eventData?.reference || '').trim();
      if (!reference) {
        return res.status(200).json(buildWebhookResponse('Reference absente, evenement ignore'));
      }

      const session = await retrieveDexPayCheckoutByReference(reference);
      if (normalizeStatus(session?.status) !== 'COMPLETED') {
        return res.status(200).json(buildWebhookResponse('Checkout non confirme, evenement ignore'));
      }

      const updatedPayment = await prisma.payment.update({
        where: { reference },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          method: 'DEXPAY',
          transactionId: String(eventData?.id || eventData?.transaction_id || reference).trim(),
          totalAmount:
            Number(session?.total_amount || 0) > 0
              ? Number(session.total_amount)
              : Number(eventData?.amount || 0) > 0
                ? Number(eventData.amount)
                : undefined,
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
        await commitOrderStockIfNeeded(updatedPayment.orderId).catch((error) => {
          console.error('DexPay webhook order stock commit failed:', {
            orderId: updatedPayment.orderId,
            paymentId: updatedPayment.id,
            message: error?.message || 'Unknown stock commit error',
          });
        });
      }

      if (updatedPayment.userId) {
        const message = updatedPayment.appointment
          ? 'Paiement DexPay confirme pour votre reservation.'
          : updatedPayment.order
            ? 'Paiement DexPay confirme pour votre commande.'
            : 'Paiement DexPay confirme avec succes.';
        await createUserNotification(updatedPayment.userId, 'payment', message);
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

      await triggerAutoPayoutForPayment(updatedPayment.id).catch(() => {});
      return res.status(200).json(buildWebhookResponse('Checkout complete traite'));
    }

    if (eventType === 'payout.completed' || eventType === 'payout.failed') {
      return res.status(200).json(buildWebhookResponse('Evenement payout recu'));
    }

    return res.status(200).json(buildWebhookResponse('Evenement ignore'));
  } catch (error) {
    console.error('DexPay webhook error:', error.message);
    return res.status(500).json({ status: 'error', message: 'Erreur traitement webhook DexPay' });
  }
});

module.exports = router;
