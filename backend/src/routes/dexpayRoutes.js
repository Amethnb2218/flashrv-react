const express = require('express');
const prisma = require('../lib/prisma');
const {
  createDexPayPayout,
  retrieveDexPayCheckoutByReference,
  retrieveDexPayPayout,
  getDexPayConfig,
  computePayoutAmount,
} = require('../services/dexpayService');
const { pushNotification } = require('../realtime/hub');
const { sendBookingConfirmationEmail, sendOrderConfirmationEmail } = require('../services/emailService');

const router = express.Router();

const PAYOUT_OPERATOR_BY_METHOD = {
  WAVE: 'wave',
  ORANGE_MONEY: 'orange_money',
};

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

const resolvePayoutDestination = (payment) => {
  const methods =
    payment?.appointment?.salon?.paymentMethods ||
    payment?.order?.salon?.paymentMethods ||
    [];

  const enabled = Array.isArray(methods)
    ? methods.filter((item) => item?.enabled !== false)
    : [];

  for (const key of ['WAVE', 'ORANGE_MONEY']) {
    const match = enabled.find((item) => String(item?.method || '').toUpperCase() === key);
    if (match?.phoneNumber) {
      return {
        method: key,
        operator: PAYOUT_OPERATOR_BY_METHOD[key],
        phoneNumber: String(match.phoneNumber || '').trim(),
        recipientName: String(match.displayName || payment?.appointment?.salon?.name || payment?.order?.salon?.name || '').trim() || null,
      };
    }
  }

  const hasUnsupportedFreeMoney = enabled.some((item) => String(item?.method || '').toUpperCase() === 'FREE_MONEY');
  if (hasUnsupportedFreeMoney) {
    return { unsupported: true, reason: 'FREE_MONEY_UNSUPPORTED' };
  }

  return null;
};

const triggerAutoPayoutForPayment = async (paymentId) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      appointment: {
        include: {
          salon: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              paymentMethods: {
                select: {
                  method: true,
                  enabled: true,
                  displayName: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      },
      order: {
        include: {
          salon: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              paymentMethods: {
                select: {
                  method: true,
                  enabled: true,
                  displayName: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!payment) return;
  if (normalizeStatus(payment.method) !== 'DEXPAY') return;
  if (normalizeStatus(payment.status) !== 'COMPLETED') return;

  const payoutStatus = normalizeStatus(payment.payoutStatus);
  if (['PENDING', 'PROCESSING', 'COMPLETED'].includes(payoutStatus) && payment.payoutReference) {
    return;
  }

  const destination = resolvePayoutDestination(payment);
  const ownerId = payment?.appointment?.salon?.ownerId || payment?.order?.salon?.ownerId || null;
  const salonName = payment?.appointment?.salon?.name || payment?.order?.salon?.name || 'votre espace';

  if (destination?.unsupported) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        payoutStatus: 'UNSUPPORTED',
        payoutFailureReason: 'FREE_MONEY non supporte automatiquement par DexPay. Configurez Wave ou Orange Money.',
      },
    }).catch(() => {});
    await createUserNotification(
      ownerId,
      'payment',
      `Paiement encaisse pour ${salonName}, mais le reversement automatique n est pas disponible avec Free Money. Configurez Wave ou Orange Money.`
    );
    return;
  }

  if (!destination?.phoneNumber || !destination?.operator) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        payoutStatus: 'PENDING_CONFIG',
        payoutFailureReason: 'Aucun compte Wave ou Orange Money configure pour le reversement DexPay.',
      },
    }).catch(() => {});
    await createUserNotification(
      ownerId,
      'payment',
      `Paiement encaisse pour ${salonName}, mais aucun compte de versement DexPay n est configure. Ajoutez Wave ou Orange Money dans vos moyens de paiement.`
    );
    return;
  }

  const payoutAmount = computePayoutAmount(payment.amount || payment.totalAmount || 0);
  if (!(payoutAmount > 0)) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        payoutStatus: 'FAILED',
        payoutFailureReason: 'Montant de reversement invalide.',
      },
    }).catch(() => {});
    return;
  }

  try {
    const payout = await createDexPayPayout({
      amount: payoutAmount,
      destinationPhone: destination.phoneNumber,
      operator: destination.operator,
      recipientName: destination.recipientName,
      metadata: {
        paymentId: payment.id,
        appointmentId: payment.appointmentId || null,
        orderId: payment.orderId || null,
        salonId: payment?.appointment?.salon?.id || payment?.order?.salon?.id || null,
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        payoutReference: payout.reference || payout.id,
        payoutStatus: normalizeStatus(payout.status || 'PENDING'),
        payoutAmount,
        payoutFees: Number(payout.fees || 0),
        payoutDestinationPhone: destination.phoneNumber,
        payoutOperator: destination.method,
        payoutTriggeredAt: new Date(),
        payoutFailureReason: null,
        ...(normalizeStatus(payout.status) === 'COMPLETED' ? { payoutCompletedAt: new Date() } : {}),
      },
    }).catch(() => {});

    await createUserNotification(
      ownerId,
      'payment',
      `Paiement recu pour ${salonName}. Reversement DexPay ${normalizeStatus(payout.status) === 'COMPLETED' ? 'effectue' : 'lance'} vers votre compte ${destination.method === 'WAVE' ? 'Wave' : 'Orange Money'}.`
    );
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        payoutStatus: 'FAILED',
        payoutAmount,
        payoutDestinationPhone: destination.phoneNumber,
        payoutOperator: destination.method,
        payoutTriggeredAt: new Date(),
        payoutFailureReason: error?.message || 'Echec du reversement DexPay.',
      },
    }).catch(() => {});
    await createUserNotification(
      ownerId,
      'payment',
      `Paiement recu pour ${salonName}, mais le reversement DexPay a echoue. Nous allons devoir le relancer.`
    );
  }
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

      await triggerAutoPayoutForPayment(updatedPayment.id);
      return res.status(200).json(buildWebhookResponse('Checkout complete traite'));
    }

    if (eventType === 'payout.completed' || eventType === 'payout.failed') {
      let payout = null;
      if (eventData?.id) {
        payout = await retrieveDexPayPayout(eventData.id).catch(() => null);
      }

      const payoutReference = String(
        payout?.reference ||
        eventData?.reference ||
        eventData?.id ||
        ''
      ).trim();

      if (!payoutReference) {
        return res.status(200).json(buildWebhookResponse('Reference payout absente, evenement ignore'));
      }

      const payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { payoutReference },
            { payoutReference: String(eventData?.id || '').trim() || undefined },
          ].filter(Boolean),
        },
      });

      if (!payment) {
        return res.status(200).json(buildWebhookResponse('Paiement payout introuvable'));
      }

      const nextStatus = eventType === 'payout.completed' ? 'COMPLETED' : 'FAILED';
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          payoutReference,
          payoutStatus: nextStatus,
          payoutFailureReason: nextStatus === 'FAILED' ? String(eventData?.failure_reason || payout?.failure_reason || 'Echec du reversement DexPay').trim() : null,
          ...(nextStatus === 'COMPLETED' ? { payoutCompletedAt: new Date() } : {}),
        },
      }).catch(() => {});

      return res.status(200).json(buildWebhookResponse('Evenement payout traite'));
    }

    return res.status(200).json(buildWebhookResponse('Evenement ignore'));
  } catch (error) {
    console.error('DexPay webhook error:', error.message);
    return res.status(500).json({ status: 'error', message: 'Erreur traitement webhook DexPay' });
  }
});

module.exports = router;
