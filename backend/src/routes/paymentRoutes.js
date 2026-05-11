const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireApprovedPro } = require('../middleware/auth');
const { confirmPaydunyaInvoice } = require('../services/paydunyaService');
const { createDexPayCheckout, getDexPayConfig, retrieveDexPayCheckoutByReference } = require('../services/dexpayService');
// const { initiateWavePayment, checkWavePaymentStatus } = require('../services/paymentService'); // TODO: enable when Wave API key is available
const { pushNotification } = require('../realtime/hub');
const { sendBookingConfirmationEmail, sendOrderConfirmationEmail } = require('../services/emailService');
const { createBookingNotification } = require('../services/bookingNotificationService');
const { resolvePublicBaseUrl } = require('../utils/publicUrl');
const { commitOrderStockIfNeeded } = require('../utils/orderStock');
const { triggerAutoPayoutForPayment } = require('../services/dexpayPayoutService');

const router = express.Router();

const ALLOWED_PROVIDERS = ['DEXPAY', 'PAY_ON_SITE'];
const DEXPAY_MIN_ORDER_AMOUNT = 1200;
const DEXPAY_MIN_BOOKING_AMOUNT = 1200;
const DEXPAY_PLATFORM_FEE_RATE = 0.02;
const DEFAULT_DEXPAY_TIMEOUT_MS = 6000;
const MAX_DEXPAY_TIMEOUT_MS = 7000;
const ROUTE_TIMEOUT_BUFFER_MS = 1000;
const MIN_ROUTE_TIMEOUT_MS = 7000;

const resolveDexPayTimeoutMs = () => {
  try {
    const configuredTimeout = Number(getDexPayConfig()?.timeout);
    if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
      return Math.min(configuredTimeout, MAX_DEXPAY_TIMEOUT_MS);
    }
  } catch (_) {
    // DexPay may not be configured yet; fall back to env/default values.
  }

  const parsed = Number(process.env.DEXPAY_TIMEOUT_MS || process.env.DEXPAY_REQUEST_TIMEOUT_MS);
  if (Number.isFinite(parsed) && parsed > 0) return Math.min(parsed, MAX_DEXPAY_TIMEOUT_MS);
  return DEFAULT_DEXPAY_TIMEOUT_MS;
};

const ROUTE_TIMEOUT_MS = Math.min(
  8500,
  Math.max(MIN_ROUTE_TIMEOUT_MS, resolveDexPayTimeoutMs() + ROUTE_TIMEOUT_BUFFER_MS)
);
const withRouteTimeout = (promise, label = 'operation') => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('Le serveur est temporairement indisponible. Reessayez dans un instant.');
      err.statusCode = 503;
      err.expose = true;
      reject(err);
    }, ROUTE_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const generateReference = () => {
  const crypto = require('crypto');
  return 'FRV-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
};

const calculateDexPayPlatformFee = (amount) => {
  const normalized = Math.max(0, Number(amount || 0));
  return Math.round(normalized * DEXPAY_PLATFORM_FEE_RATE);
};

const calculateDexPayGrossAmount = (amount) => {
  const normalized = Math.max(0, Number(amount || 0));
  return normalized + calculateDexPayPlatformFee(normalized);
};

const getBaseUrls = () => {
  const frontendBase =
    resolvePublicBaseUrl(process.env.BASE_URL, process.env.FRONTEND_URL, process.env.ALLOWED_ORIGINS) ||
    'http://localhost:3000';
  const backendBase =
    resolvePublicBaseUrl(process.env.API_URL) ||
    `http://localhost:${process.env.PORT || 4000}`;
  return {
    frontendBase,
    backendBase,
  };
};

const logDexPayContext = (label, context = {}) => {
  console.info(label, {
    reference: context.reference || null,
    bookingId: context.bookingId || null,
    orderId: context.orderId || null,
    amount: Number(context.amount || 0) || 0,
    successUrl: context.successUrl || null,
    cancelUrl: context.cancelUrl || null,
    webhookUrl: context.webhookUrl || null,
    userId: context.userId || null,
  });
};

const toOperationalPaydunyaError = (error) => {
  if (error?.statusCode && error?.expose === true) {
    return error;
  }

  const normalizedMessage = String(error?.message || '').trim().toLowerCase();
  const isConfigIssue = normalizedMessage.includes('paydunya') && normalizedMessage.includes('configure');
  const wrapped = new Error(
    isConfigIssue
      ? 'PayDunya n est plus actif sur le serveur.'
      : 'Impossible de verifier un ancien paiement PayDunya pour le moment.'
  );
  wrapped.statusCode = isConfigIssue ? 503 : 502;
  wrapped.expose = true;
  return wrapped;
};

const toOperationalDexPayError = (error, phase = 'create') => {
  if (error?.statusCode && error?.expose === true) {
    return error;
  }

  const normalizedMessage = String(error?.message || '').trim().toLowerCase();
  const normalizedCode = String(error?.code || '').trim().toUpperCase();
  const isConfigIssue = normalizedMessage.includes('dexpay') && normalizedMessage.includes('configure');
  const isTransientIssue =
    normalizedCode === 'TIMEOUT' ||
    normalizedCode === 'NETWORK_ERROR' ||
    normalizedMessage.includes('timeout') ||
    normalizedMessage.includes('network');
  const message = isConfigIssue
    ? 'DexPay n est pas configure sur le serveur.'
    : isTransientIssue
      ? 'DexPay met trop de temps a repondre. Reessayez dans un instant.'
    : phase === 'verify'
      ? 'Impossible de verifier le paiement DexPay pour le moment.'
      : 'Impossible d initialiser le paiement DexPay. Reessayez dans quelques instants.';

  const wrapped = new Error(message);
  wrapped.statusCode = isConfigIssue || isTransientIssue ? 503 : 502;
  wrapped.expose = true;
  return wrapped;
};

const buildDexPayWebhookUrl = (backendBase) => {
  return `${backendBase}/api/dexpay/webhook`;
};

const normalizeProviderStatus = (value, fallback = 'PENDING') =>
  String(value || fallback).trim().toUpperCase();

const isDexPayMissingCheckoutError = (error) => {
  const status = Number(error?.statusCode || error?.status || 0);
  if (status === 404) return true;
  const code = String(error?.code || '').trim().toUpperCase();
  if (code === 'NOT_FOUND') return true;
  const message = String(error?.message || '').trim().toLowerCase();
  return message.includes('not found') || message.includes('introuvable');
};

const findReusableDexPayCheckout = async (reference) => {
  const normalizedReference = String(reference || '').trim();
  if (!normalizedReference) return null;

  try {
    const existing = await retrieveDexPayCheckoutByReference(normalizedReference);
    if (!existing?.reference) return null;
    return existing;
  } catch (error) {
    if (isDexPayMissingCheckoutError(error)) return null;
    throw error;
  }
};

const getOrCreateDexPayCheckout = async ({
  reference,
  amount,
  itemName,
  successUrl,
  failureUrl,
  webhookUrl,
  metadata,
}) => {
  logDexPayContext('DexPay checkout orchestration:', {
    reference,
    amount,
    successUrl,
    cancelUrl: failureUrl,
    webhookUrl,
    bookingId: metadata?.bookingId || null,
    orderId: metadata?.orderId || null,
    userId: metadata?.userId || null,
  });
  try {
    return await createDexPayCheckout({
      amount,
      reference,
      itemName,
      successUrl,
      failureUrl,
      webhookUrl,
      metadata,
    });
  } catch (error) {
    const transient = ['TIMEOUT', 'NETWORK_ERROR'].includes(String(error?.code || '').trim().toUpperCase())
      || [408, 502, 503, 504].includes(Number(error?.statusCode || error?.status || 0));
    console.error('DexPay checkout orchestration failed:', {
      reference,
      transient,
      statusCode: error?.statusCode || error?.status || null,
      code: error?.code || null,
      message: error?.message || 'DexPay checkout orchestration failed',
    });

    if (transient) {
      const recovered = await findReusableDexPayCheckout(reference).catch(() => null);
      const recoveredStatus = normalizeProviderStatus(recovered?.status);
      if (recovered?.paymentUrl && !['FAILED', 'CANCELLED'].includes(recoveredStatus)) {
        return recovered;
      }
    }
    throw error;
  }
};

const markAppointmentPendingPayment = async (bookingId) => {
  if (!bookingId) return;
  await prisma.appointment.update({
    where: { id: bookingId },
    data: { status: 'PENDING_PAYMENT' },
  }).catch(() => {
    // noop when booking does not exist yet
  });
};

const markAppointmentPaid = async (bookingId) => {
  if (!bookingId) return;
  await prisma.appointment.update({
    where: { id: bookingId },
    data: { status: 'PAID' },
  }).catch(() => {
    // noop
  });
};

const markOrderPendingPayment = async (orderId) => {
  if (!orderId) return;
  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'PENDING_PAYMENT' },
  }).catch(() => {
    // noop when order does not exist
  });
};

const markOrderPaid = async (orderId) => {
  if (!orderId) return;
  await commitOrderStockIfNeeded(orderId).catch((error) => {
    console.error('Order paid stock commit failed:', {
      orderId,
      message: error?.message || 'Unknown stock commit error',
    });
  });
};

const notifyPaymentCompleted = async (payment) => {
  if (!payment?.userId) return;

  const appointment = payment.appointmentId
    ? await prisma.appointment.findUnique({
        where: { id: payment.appointmentId },
        include: {
          salon: { select: { id: true, name: true } },
          client: { select: { id: true, name: true, email: true } },
          service: { select: { id: true, name: true, price: true } },
        },
      }).catch(() => null)
    : null;
  const order = payment.orderId
    ? await prisma.order.findUnique({
        where: { id: payment.orderId },
        include: {
          salon: { select: { id: true, name: true } },
          client: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, price: true } },
            },
          },
        },
      }).catch(() => null)
    : null;

  const message = appointment
    ? `Paiement confirme pour votre reservation chez ${appointment.salon?.name || 'le salon'}.`
    : order
      ? `Paiement confirme pour votre commande chez ${order.salon?.name || 'la boutique'}.`
      : 'Paiement confirme avec succes.';

  try {
    const notification = await prisma.notification.create({
      data: {
        userId: payment.userId,
        type: 'payment',
        message,
      },
    });
    pushNotification(notification.userId, notification);
  } catch (error) {
    console.error('Payment notification error:', error.message);
  }

  if (appointment?.client?.email) {
    sendBookingConfirmationEmail({
      to: appointment.client.email,
      clientName: appointment.client.name || 'Client',
      salonName: appointment.salon?.name || 'le salon',
      date: appointment.date,
      time: appointment.startTime,
      services: appointment.service ? [appointment.service] : [],
      totalPrice: appointment.totalPrice || appointment.service?.price || payment.amount || 0,
    }).catch(() => {});
  }

  if (order?.client?.email) {
    sendOrderConfirmationEmail({
      to: order.client.email,
      clientName: order.clientName || order.client.name || 'Client',
      boutiqueName: order.salon?.name || 'la boutique',
      items: order.items || [],
      totalPrice: order.totalPrice || payment.amount || 0,
      deliveryMode: order.deliveryMode,
    }).catch(() => {});
  }
};

const upsertPaymentForTarget = async ({
  appointmentId,
  orderId,
  userId,
  amount,
  feeAmount = 0,
  totalAmount = amount,
  reference,
  transactionId,
  method = 'DEXPAY',
  status = 'PENDING',
}) => {
  const data = {
    transactionId,
    amount,
    fees: Math.max(0, Number(feeAmount || 0)),
    totalAmount: Math.max(0, Number(totalAmount || amount || 0)),
    currency: 'XOF',
    method,
    status,
    reference,
    appointmentId: appointmentId || null,
    orderId: orderId || null,
    userId,
  };

  const existing = appointmentId
    ? await prisma.payment.findFirst({ where: { appointmentId } })
    : orderId
      ? await prisma.payment.findFirst({ where: { orderId } })
      : null;

  if (existing) {
    return prisma.payment.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.payment.create({ data });
};

const createDexPayPaymentForBooking = async ({
  bookingId,
  amount,
  customerName,
  customerEmail,
  successUrl,
  cancelUrl,
  user,
}) => {
  const booking = await prisma.appointment.findUnique({
    where: { id: bookingId },
    include: {
      salon: { select: { id: true, name: true } },
      service: { select: { id: true, name: true } },
      client: { select: { id: true } },
    },
  });

  if (!booking) {
    const err = new Error('Reservation introuvable');
    err.statusCode = 404;
    throw err;
  }

  if (booking.clientId !== user.id) {
    const err = new Error('Acces interdit');
    err.statusCode = 403;
    throw err;
  }

  if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(String(booking.status || '').toUpperCase())) {
    const err = new Error('Cette reservation ne peut plus etre payee');
    err.statusCode = 400;
    throw err;
  }

  const dbAmount = Number(booking.totalPrice || booking.service?.price || 0);
  if (!Number.isFinite(dbAmount) || dbAmount <= 0) {
    const err = new Error('Impossible de determiner le montant de la reservation depuis la base de donnees');
    err.statusCode = 400;
    throw err;
  }

  // Reject if client-provided amount differs from the DB amount (prevent price tampering)
  if (amount !== undefined && amount !== null) {
    const clientAmount = Number(amount);
    if (Number.isFinite(clientAmount) && clientAmount !== dbAmount) {
      const err = new Error('Le montant fourni ne correspond pas au prix de la reservation');
      err.statusCode = 400;
      err.expose = true;
      throw err;
    }
  }

  const baseAmount = dbAmount;
  const platformFeeAmount = calculateDexPayPlatformFee(baseAmount);
  const grossAmount = calculateDexPayGrossAmount(baseAmount);
  if (baseAmount < DEXPAY_MIN_BOOKING_AMOUNT) {
    const err = new Error(`Le paiement DexPay est disponible a partir de ${DEXPAY_MIN_BOOKING_AMOUNT} FCFA pour une reservation.`);
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }

  const { frontendBase, backendBase } = getBaseUrls();
  const resolvedSuccessUrl = successUrl || `${frontendBase}/payment/success?appointmentId=${encodeURIComponent(bookingId)}`;
  const resolvedCancelUrl = cancelUrl || `${frontendBase}/payment/cancel?appointmentId=${encodeURIComponent(bookingId)}`;
  const webhookUrl = buildDexPayWebhookUrl(backendBase);
  const reference = `APT-${String(bookingId || '').trim()}`;
  logDexPayContext('Preparing DexPay booking payment:', {
    reference,
    bookingId,
    amount: grossAmount,
    successUrl: resolvedSuccessUrl,
    cancelUrl: resolvedCancelUrl,
    webhookUrl,
    userId: user.id,
  });
  const payment = await upsertPaymentForTarget({
    appointmentId: bookingId,
    userId: user.id,
    amount: grossAmount,
    feeAmount: platformFeeAmount,
    totalAmount: grossAmount,
    reference,
    transactionId: reference,
    method: 'DEXPAY',
    status: 'PENDING',
  });

  await markAppointmentPendingPayment(bookingId);

  let checkout;
  try {
    checkout = await getOrCreateDexPayCheckout({
      amount: grossAmount,
      reference,
      itemName: booking.service?.name || 'Reservation salon',
      successUrl: resolvedSuccessUrl,
      failureUrl: resolvedCancelUrl,
      webhookUrl,
      metadata: {
        type: 'APPOINTMENT',
        bookingId,
        userId: user.id,
        customerName: customerName || user.name || "Client Jolof'Era",
        customerEmail: customerEmail || user.email || '',
      },
    });
  } catch (error) {
    throw toOperationalDexPayError(error, 'create');
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      method: 'DEXPAY',
      transactionId: String(checkout?.id || checkout?.reference || reference).trim() || reference,
      status: normalizeProviderStatus(checkout?.status),
    },
  }).catch(() => {});

  return {
    payment: { ...payment, method: 'DEXPAY' },
    invoiceUrl: checkout.paymentUrl,
    token: checkout.reference || reference,
  };
};

const createDexPayPaymentForOrder = async ({
  orderId,
  amount,
  customerName,
  customerEmail,
  successUrl,
  cancelUrl,
  user,
}) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      salon: { select: { id: true, name: true } },
      client: { select: { id: true } },
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  });

  if (!order) {
    const err = new Error('Commande introuvable');
    err.statusCode = 404;
    throw err;
  }

  if (order.clientId !== user.id) {
    const err = new Error('Acces interdit');
    err.statusCode = 403;
    throw err;
  }

  if (['DELIVERED', 'CANCELLED'].includes(String(order.status || '').toUpperCase())) {
    const err = new Error('Cette commande ne peut plus etre payee');
    err.statusCode = 400;
    throw err;
  }

  const dbAmount = Number(order.totalPrice || 0);
  if (!Number.isFinite(dbAmount) || dbAmount <= 0) {
    const err = new Error('Impossible de determiner le montant de la commande depuis la base de donnees');
    err.statusCode = 400;
    throw err;
  }

  // Reject if client-provided amount differs from the DB amount (prevent price tampering)
  if (amount !== undefined && amount !== null) {
    const clientAmount = Number(amount);
    if (Number.isFinite(clientAmount) && clientAmount !== dbAmount) {
      const err = new Error('Le montant fourni ne correspond pas au prix de la commande');
      err.statusCode = 400;
      err.expose = true;
      throw err;
    }
  }

  const baseAmount = dbAmount;
  const platformFeeAmount = calculateDexPayPlatformFee(baseAmount);
  const grossAmount = calculateDexPayGrossAmount(baseAmount);
  if (baseAmount < DEXPAY_MIN_ORDER_AMOUNT) {
    const err = new Error(`Le paiement DexPay est disponible a partir de ${DEXPAY_MIN_ORDER_AMOUNT} FCFA pour cette commande.`);
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }

  const { frontendBase, backendBase } = getBaseUrls();
  const resolvedSuccessUrl = successUrl || `${frontendBase}/order/payment/success?orderId=${encodeURIComponent(orderId)}`;
  const resolvedCancelUrl = cancelUrl || `${frontendBase}/order/payment/cancel?orderId=${encodeURIComponent(orderId)}`;
  const webhookUrl = buildDexPayWebhookUrl(backendBase);
  const itemLabel = (order.items || [])
    .map((entry) => `${entry.product?.name || 'Article'} x${entry.quantity}`)
    .join(', ');
  const reference = `ORD-${String(orderId || '').trim()}`;
  logDexPayContext('Preparing DexPay order payment:', {
    reference,
    orderId,
    amount: grossAmount,
    successUrl: resolvedSuccessUrl,
    cancelUrl: resolvedCancelUrl,
    webhookUrl,
    userId: user.id,
  });
  const payment = await upsertPaymentForTarget({
    orderId,
    userId: user.id,
    amount: grossAmount,
    feeAmount: platformFeeAmount,
    totalAmount: grossAmount,
    reference,
    transactionId: reference,
    method: 'DEXPAY',
    status: 'PENDING',
  });

  await markOrderPendingPayment(orderId);

  let checkout;
  try {
    checkout = await getOrCreateDexPayCheckout({
      amount: grossAmount,
      reference,
      itemName: itemLabel || 'Commande boutique',
      successUrl: resolvedSuccessUrl,
      failureUrl: resolvedCancelUrl,
      webhookUrl,
      metadata: {
        type: 'ORDER',
        orderId,
        userId: user.id,
        customerName: customerName || user.name || "Client Jolof'Era",
        customerEmail: customerEmail || user.email || '',
      },
    });
  } catch (error) {
    throw toOperationalDexPayError(error, 'create');
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      method: 'DEXPAY',
      transactionId: String(checkout?.id || checkout?.reference || reference).trim() || reference,
      status: normalizeProviderStatus(checkout?.status),
    },
  }).catch(() => {});

  return {
    payment: { ...payment, method: 'DEXPAY' },
    invoiceUrl: checkout.paymentUrl,
    token: checkout.reference || reference,
  };
};

const verifyPaymentRecord = async (payment) => {
  if (!payment) return null;

  const paymentMethod = String(payment.method || '').toUpperCase();
  if (paymentMethod === 'DEXPAY' || paymentMethod === 'PAYTECH') {
    if (String(payment.status || '').toUpperCase() === 'COMPLETED') {
      await markAppointmentPaid(payment.appointmentId);
      await markOrderPaid(payment.orderId);
      triggerAutoPayoutForPayment(payment.id).catch((error) => {
        console.error('DexPay payout retry after completed payment failed:', {
          paymentId: payment.id,
          message: error?.message || 'DexPay payout retry failed',
        });
      });
      return payment;
    }

    try {
      const session = await retrieveDexPayCheckoutByReference(payment.reference || payment.transactionId);
      if (String(session?.status || '').toUpperCase() === 'COMPLETED') {
        const updated = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            method: 'DEXPAY',
            transactionId: String(session?.reference || payment.transactionId || '').trim() || payment.transactionId,
            totalAmount:
              Number(session?.total_amount || 0) > 0
                ? Number(session.total_amount)
                : payment.totalAmount,
          },
        });
        await markAppointmentPaid(updated.appointmentId);
        await markOrderPaid(updated.orderId);
        await notifyPaymentCompleted(updated);
        triggerAutoPayoutForPayment(updated.id).catch((error) => {
          console.error('DexPay payout after verify completion failed:', {
            paymentId: updated.id,
            message: error?.message || 'DexPay payout after verify failed',
          });
        });
        return updated;
      }
    } catch (error) {
      const operationalError = toOperationalDexPayError(error, 'verify');
      console.error('DexPay verify fallback:', {
        paymentId: payment.id,
        reference: payment.reference || payment.transactionId || null,
        statusCode: operationalError?.statusCode || error?.statusCode || error?.status || null,
        code: error?.code || null,
        message: operationalError?.message || error?.message || 'DexPay verify failed',
      });
      return payment;
    }

    return payment;
  }

  if (paymentMethod !== 'PAYDUNYA') {
    return payment;
  }

  if (String(payment.status || '').toUpperCase() === 'COMPLETED') {
    return payment;
  }

  let verification;
  try {
    verification = await confirmPaydunyaInvoice(payment.reference || payment.transactionId);
  } catch (error) {
    throw toOperationalPaydunyaError(error, 'verify');
  }

  if (verification.isPaid) {
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        transactionId: verification.token || payment.transactionId,
      },
    });
    await markAppointmentPaid(updated.appointmentId);
    await markOrderPaid(updated.orderId);
    await notifyPaymentCompleted(updated);
    return updated;
  }

  return payment;
};

const resolvePaymentTarget = async ({ bookingId, orderId, userId }) => {
  const normalizedOrderId = String(orderId || '').trim();
  const normalizedBookingId = String(bookingId || '').trim();

  if (normalizedOrderId) {
    const order = await prisma.order.findUnique({
      where: { id: normalizedOrderId },
      select: { id: true, clientId: true },
    });
    if (order && order.clientId === userId) {
      return { type: 'ORDER', id: normalizedOrderId };
    }
  }

  if (!normalizedBookingId) return null;

  const [appointment, fallbackOrder] = await Promise.all([
    prisma.appointment.findUnique({
      where: { id: normalizedBookingId },
      select: { id: true, clientId: true },
    }),
    prisma.order.findUnique({
      where: { id: normalizedBookingId },
      select: { id: true, clientId: true },
    }),
  ]);

  if (appointment && appointment.clientId === userId) {
    return { type: 'APPOINTMENT', id: normalizedBookingId };
  }
  if (fallbackOrder && fallbackOrder.clientId === userId) {
    return { type: 'ORDER', id: normalizedBookingId };
  }

  return null;
};

const getPaymentSalonOwnerId = (payment) => {
  return (
    payment?.appointment?.salon?.ownerId ||
    payment?.order?.salon?.ownerId ||
    null
  );
};

const canReadPayment = (user, payment) => {
  if (!user || !payment) return false;
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
  if (payment.userId === user.id) return true;
  const salonOwnerId = getPaymentSalonOwnerId(payment);
  return Boolean(salonOwnerId && salonOwnerId === user.id);
};

const canRefundPayment = (user, payment) => {
  if (!user || !payment) return false;
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
  const salonOwnerId = getPaymentSalonOwnerId(payment);
  return Boolean(salonOwnerId && salonOwnerId === user.id);
};

/**
 * GET /api/payments
 * Retourne les paiements du salon (proprietaire)
 */
router.get('/', authenticate, requireApprovedPro, async (req, res, next) => {
  try {
    const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
    if (!salon) return res.status(200).json([]);
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { appointment: { salonId: salon.id } },
          { order: { salonId: salon.id } },
          { userId: req.user.id },
        ],
      },
      include: {
        appointment: {
          include: {
            client: { select: { id: true, name: true, username: true, email: true, phoneNumber: true, picture: true } },
            service: { select: { id: true, name: true, price: true, duration: true, depositPercentage: true } },
          },
        },
        order: {
          include: {
            client: { select: { id: true, name: true, username: true, email: true, phoneNumber: true, picture: true } },
            items: { include: { product: { select: { id: true, name: true, price: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const retryableDexPayPayment = payments.find((payment) => {
      const paymentMethod = String(payment?.method || '').trim().toUpperCase();
      const paymentStatus = String(payment?.status || '').trim().toUpperCase();
      const payoutStatus = String(payment?.manualMethod || '').trim().toUpperCase();
      return (
        paymentMethod === 'DEXPAY' &&
        paymentStatus === 'COMPLETED' &&
        payoutStatus !== 'AUTO_PAYOUT_COMPLETED' &&
        payoutStatus !== 'AUTO_PAYOUT_PENDING'
      );
    });
    if (retryableDexPayPayment?.id) {
      setTimeout(() => {
        triggerAutoPayoutForPayment(retryableDexPayPayment.id).catch((error) => {
          console.error('DexPay payout retry from payments list failed:', {
            paymentId: retryableDexPayPayment.id,
            message: error?.message || 'Unknown DexPay retry error',
          });
        });
      }, 0);
    }
    res.status(200).json(payments);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/create
 * Cree une session DexPay pour une reservation ou une commande
 */
router.post('/create', authenticate, async (req, res, next) => {
  try {
    const { bookingId, orderId, amount, customerName, customerEmail, successUrl, cancelUrl } = req.body;

    if (!bookingId && !orderId) {
      return res.status(400).json({ status: 'error', message: 'bookingId ou orderId requis' });
    }

    const { frontendBase } = getBaseUrls();
    const allowedUrlHosts = [];
    try { allowedUrlHosts.push(new URL(frontendBase).hostname); } catch (_) {}
    ['jolofera.com', 'www.jolofera.com'].forEach(h => { if (!allowedUrlHosts.includes(h)) allowedUrlHosts.push(h); });

    const validateRedirectUrl = (url) => {
      if (!url) return true;
      try {
        const parsed = new URL(url);
        return allowedUrlHosts.includes(parsed.hostname);
      } catch (_) { return false; }
    };

    if (!validateRedirectUrl(successUrl) || !validateRedirectUrl(cancelUrl)) {
      return res.status(400).json({ status: 'error', message: 'URL de redirection non autorisee.' });
    }

    const result = await withRouteTimeout((async () => {
      const target = await resolvePaymentTarget({
        bookingId,
        orderId,
        userId: req.user.id,
      });
      if (!target) {
        const err = new Error('Reservation ou commande introuvable');
        err.statusCode = 404;
        err.expose = true;
        throw err;
      }

      const invoiceResult = await (target.type === 'ORDER'
        ? createDexPayPaymentForOrder({
            orderId: target.id,
            amount,
            customerName,
            customerEmail,
            successUrl,
            cancelUrl,
            user: req.user,
          })
        : createDexPayPaymentForBooking({
            bookingId: target.id,
            amount,
            customerName,
            customerEmail,
            successUrl,
            cancelUrl,
            user: req.user,
          }));

      return { invoiceResult, target };
    })(), 'payments/create');

    console.info('POST /api/payments/create completed', {
      paymentId: result.invoiceResult?.payment?.id || null,
      orderId: result.target?.type === 'ORDER' ? result.target.id : null,
      bookingId: result.target?.type === 'APPOINTMENT' ? result.target.id : null,
      provider: 'DEXPAY',
    });

    res.status(200).json({
      status: 'success',
      message: 'Session DexPay creee',
      data: {
        paymentId: result.invoiceResult.payment.id,
        bookingId: result.target.type === 'APPOINTMENT' ? result.target.id : null,
        orderId: result.target.type === 'ORDER' ? result.target.id : null,
        invoiceUrl: result.invoiceResult.invoiceUrl,
        token: result.invoiceResult.token,
        provider: 'DEXPAY',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/init
 * Compatibilite ancienne API (redirige vers DexPay)
 */
router.post('/init', authenticate, async (req, res, next) => {
  try {
    const { provider, amount, bookingId, orderId, customerName, customerEmail, successUrl, cancelUrl } = req.body;
    const rawProvider = String(provider || '').toUpperCase();
    const normalizedProvider = ['PAYDUNYA', 'PAYTECH'].includes(rawProvider)
      ? 'DEXPAY'
      : rawProvider;
    console.info('POST /api/payments/init received', {
      provider: normalizedProvider || rawProvider || null,
      bookingId: String(bookingId || '').trim() || null,
      orderId: String(orderId || '').trim() || null,
      userId: req.user?.id || null,
    });

    if (!ALLOWED_PROVIDERS.includes(normalizedProvider)) {
      return res.status(400).json({
        status: 'error',
        message: `Methode de paiement non autorisee. Methodes acceptees: ${ALLOWED_PROVIDERS.join(', ')}`,
      });
    }

    if (normalizedProvider === 'PAY_ON_SITE') {
      return res.status(400).json({
        status: 'error',
        message: 'Utilisez /api/payments/confirm-on-site pour le paiement sur place',
      });
    }

    const target = await resolvePaymentTarget({
      bookingId,
      orderId,
      userId: req.user.id,
    });
    if (!target) {
      return res.status(404).json({ status: 'error', message: 'Reservation ou commande introuvable' });
    }

    const result = await withRouteTimeout((target.type === 'ORDER'
      ? createDexPayPaymentForOrder({
          orderId: target.id,
          amount,
          customerName,
          customerEmail,
          successUrl,
          cancelUrl,
          user: req.user,
        })
      : createDexPayPaymentForBooking({
          bookingId: target.id,
          amount,
          customerName,
          customerEmail,
          successUrl,
          cancelUrl,
          user: req.user,
        })), 'payments/init');

    console.info('POST /api/payments/init completed', {
      paymentId: result?.payment?.id || null,
      orderId: target?.type === 'ORDER' ? target.id : null,
      bookingId: target?.type === 'APPOINTMENT' ? target.id : null,
      provider: 'DEXPAY',
    });

    res.status(200).json({
      status: 'success',
      message: 'Paiement DexPay initialise',
      data: {
        paymentId: result.payment.id,
        bookingId: target.type === 'APPOINTMENT' ? target.id : null,
        orderId: target.type === 'ORDER' ? target.id : null,
        checkoutUrl: result.invoiceUrl,
        invoiceUrl: result.invoiceUrl,
        token: result.token,
        provider: 'DEXPAY',
        paymentStatus: result.payment.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/confirm-on-site
 * Confirmer un paiement sur place
 */
router.post('/confirm-on-site', authenticate, async (req, res, next) => {
  try {
    const { bookingId, amount } = req.body;
    const reference = generateReference();
    const appointment = bookingId
      ? await prisma.appointment.findUnique({
          where: { id: bookingId },
          include: {
            salon: { select: { name: true } },
          },
        })
      : null;

    const payment = await prisma.payment.create({
      data: {
        transactionId: `ONSITE-${Date.now()}`,
        amount: amount || 0,
        fees: 0,
        totalAmount: amount || 0,
        currency: 'XOF',
        method: 'PAY_ON_SITE',
        status: 'ON_SITE',
        reference,
        phoneNumber: null,
        appointmentId: bookingId || null,
        userId: req.user.id,
      },
    });

    if (bookingId) {
      await prisma.appointment.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED_ON_SITE' },
      }).catch(() => {});

      if (appointment?.clientId === req.user.id) {
        try {
          const notification = await createBookingNotification({
            userId: req.user.id,
            salonName: appointment.salon?.name || 'le salon',
            date: appointment.date,
            startTime: appointment.startTime,
            message: `Reservation confirmee chez ${appointment.salon?.name || 'le salon'} le ${new Date(appointment.date).toLocaleDateString('fr-FR')} a ${appointment.startTime}. Paiement au salon.`,
          });
          pushNotification(notification.userId, notification);
        } catch (error) {
          console.error('On-site booking notification error:', error.message);
        }
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Reservation confirmee. Paiement a effectuer au salon.',
      data: {
        paymentId: payment.id,
        reference,
        status: 'ON_SITE',
        provider: 'PAY_ON_SITE',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/verify/:bookingId
 * Verifie un paiement heberge pour une reservation ou une commande
 */
router.get('/verify/:bookingId', authenticate, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { appointmentId: bookingId },
          { orderId: bookingId },
        ],
        userId: req.user.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      return res.status(404).json({ status: 'error', message: 'Paiement introuvable' });
    }

    let verified = payment;
    try {
      verified = await withRouteTimeout(verifyPaymentRecord(payment), 'payments/verify');
    } catch (error) {
      console.error('Payments verify route fallback:', {
        bookingId,
        paymentId: payment.id,
        statusCode: error?.statusCode || error?.status || null,
        message: error?.message || 'verify timeout',
      });
      verified = payment;
    }

    res.status(200).json({
      status: 'success',
      data: {
        payment: verified,
        bookingId,
        orderId: verified?.orderId || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/:id/status
 * Verifier le statut d'un paiement
 */
router.get('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        appointment: {
          select: {
            id: true,
            salonId: true,
            salon: { select: { ownerId: true } },
          },
        },
        order: {
          select: {
            id: true,
            salonId: true,
            salon: { select: { ownerId: true } },
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Paiement non trouve',
      });
    }
    if (!canReadPayment(req.user, payment)) {
      return res.status(403).json({
        status: 'error',
        message: 'Acces interdit',
      });
    }

    const verified = await verifyPaymentRecord(payment);

    res.status(200).json({
      status: 'success',
      data: { payment: verified },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/payments/:id/refund
 * Marquer un paiement comme rembourse (proprietaire du salon)
 */
router.patch('/:id/refund', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        appointment: {
          select: {
            id: true,
            salonId: true,
            salon: { select: { ownerId: true } },
          },
        },
        order: {
          select: {
            id: true,
            salonId: true,
            salon: { select: { ownerId: true } },
          },
        },
      },
    });
    if (!payment) {
      return res.status(404).json({ status: 'error', message: 'Paiement introuvable' });
    }
    if (!canRefundPayment(req.user, payment)) {
      return res.status(403).json({ status: 'error', message: 'Acces interdit' });
    }
    const currentStatus = String(payment.status || '').toUpperCase();
    if (currentStatus === 'REFUNDED') {
      return res.status(409).json({ status: 'error', message: 'Paiement deja rembourse' });
    }
    if (currentStatus !== 'COMPLETED') {
      return res.status(400).json({ status: 'error', message: 'Seuls les paiements completes peuvent etre rembourses' });
    }
    const updated = await prisma.payment.update({
      where: { id },
      data: { status: 'REFUNDED' },
    });
    res.json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/me
 * Historique des paiements de l'utilisateur connecte
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      include: {
        appointment: {
          include: {
            salon: { select: { name: true } },
            service: { select: { name: true } },
          },
        },
        order: {
          include: {
            salon: { select: { name: true } },
            items: { include: { product: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      results: payments.length,
      data: { payments },
    });
  } catch (error) {
    next(error);
  }
});

// --- Wave routes temporarily disabled (waiting for API key) ---
// POST /api/payments/wave/create and /wave/webhook are commented out
// until Wave API key is obtained and axios is added to dependencies.

module.exports = router;

