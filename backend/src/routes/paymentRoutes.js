const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireApprovedPro } = require('../middleware/auth');
const { createPaydunyaInvoice, confirmPaydunyaInvoice } = require('../services/paydunyaService');
const { initiateWavePayment, checkWavePaymentStatus } = require('../services/paymentService');
const { pushNotification } = require('../realtime/hub');
const { sendBookingConfirmationEmail, sendOrderConfirmationEmail } = require('../services/emailService');

const router = express.Router();

const ALLOWED_PROVIDERS = ['PAYDUNYA', 'WAVE', 'PAY_ON_SITE'];
const invoiceCreationInFlight = new Map();
const INFLIGHT_TTL_MS = 25000;
const ROUTE_TIMEOUT_MS = 28000;

const buildInvoiceLockKey = ({ type, id, userId }) => {
  return `${String(type || '').toUpperCase()}:${String(id || '').trim()}:${String(userId || '').trim()}`;
};

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

const runSingleFlightInvoiceCreation = async ({ lockKey, task }) => {
  const existing = invoiceCreationInFlight.get(lockKey);
  if (existing && (Date.now() - existing.startedAt) < INFLIGHT_TTL_MS) {
    return existing.promise;
  }
  if (existing) {
    invoiceCreationInFlight.delete(lockKey);
  }

  const pending = (async () => {
    try {
      return await task();
    } finally {
      invoiceCreationInFlight.delete(lockKey);
    }
  })();

  invoiceCreationInFlight.set(lockKey, { promise: pending, startedAt: Date.now() });
  return pending;
};

const generateReference = () => {
  return 'FRV-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
};

const getBaseUrls = () => {
  const frontendBase = (process.env.BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const backendBase = (process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/+$/, '');
  return {
    frontendBase,
    backendBase,
  };
};

const toOperationalPaydunyaError = (error, phase = 'create') => {
  if (error?.statusCode && error?.expose === true) {
    return error;
  }

  const normalizedMessage = String(error?.message || '').trim().toLowerCase();
  const isConfigIssue = normalizedMessage.includes('paydunya') && normalizedMessage.includes('configure');
  const message = isConfigIssue
    ? 'PayDunya n est pas configure sur le serveur.'
    : phase === 'verify'
      ? 'Impossible de verifier le paiement PayDunya pour le moment.'
      : 'Impossible d initialiser le paiement PayDunya. Reessayez dans quelques instants.';

  const wrapped = new Error(message);
  wrapped.statusCode = isConfigIssue ? 503 : 502;
  wrapped.expose = true;
  return wrapped;
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
  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'CONFIRMED' },
  }).catch(() => {
    // noop
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
  reference,
  transactionId,
  status = 'PENDING',
}) => {
  const data = {
    transactionId,
    amount,
    fees: 0,
    totalAmount: amount,
    currency: 'XOF',
    method: 'PAYDUNYA',
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

const createPaydunyaPaymentForBooking = async ({
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

  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    const err = new Error('Montant invalide');
    err.statusCode = 400;
    throw err;
  }

  const { frontendBase, backendBase } = getBaseUrls();
  const resolvedSuccessUrl = successUrl || `${frontendBase}/payment/success?appointmentId=${encodeURIComponent(bookingId)}`;
  const resolvedCancelUrl = cancelUrl || `${frontendBase}/payment/cancel?appointmentId=${encodeURIComponent(bookingId)}`;
  const callbackUrl = `${backendBase}/api/paydunya/ipn`;

  let invoice;
  try {
    invoice = await createPaydunyaInvoice({
      amount: value,
      bookingId,
      customerName: customerName || user.name || 'Client StyleFlow',
      customerEmail: customerEmail || user.email || '',
      description: `Reservation ${booking.service?.name || 'Salon'} - ${booking.salon?.name || 'StyleFlow'}`,
      successUrl: resolvedSuccessUrl,
      cancelUrl: resolvedCancelUrl,
      callbackUrl,
    });
  } catch (error) {
    throw toOperationalPaydunyaError(error, 'create');
  }

  await markAppointmentPendingPayment(bookingId);

  const payment = await upsertPaymentForTarget({
    appointmentId: bookingId,
    userId: user.id,
    amount: value,
    reference: invoice.token,
    transactionId: invoice.token,
    status: 'PENDING',
  });

  return {
    payment,
    invoiceUrl: invoice.invoiceUrl,
    token: invoice.token,
  };
};

const createPaydunyaPaymentForOrder = async ({
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

  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    const err = new Error('Montant invalide');
    err.statusCode = 400;
    throw err;
  }

  const { frontendBase, backendBase } = getBaseUrls();
  const resolvedSuccessUrl = successUrl || `${frontendBase}/order/payment/success?orderId=${encodeURIComponent(orderId)}`;
  const resolvedCancelUrl = cancelUrl || `${frontendBase}/order/payment/cancel?orderId=${encodeURIComponent(orderId)}`;
  const callbackUrl = `${backendBase}/api/paydunya/ipn`;
  const itemLabel = (order.items || [])
    .map((entry) => `${entry.product?.name || 'Article'} x${entry.quantity}`)
    .join(', ');

  let invoice;
  try {
    invoice = await createPaydunyaInvoice({
      amount: value,
      bookingId: orderId,
      customerName: customerName || user.name || 'Client StyleFlow',
      customerEmail: customerEmail || user.email || '',
      description: `Commande ${itemLabel || 'Boutique'} - ${order.salon?.name || 'StyleFlow'}`,
      successUrl: resolvedSuccessUrl,
      cancelUrl: resolvedCancelUrl,
      callbackUrl,
    });
  } catch (error) {
    throw toOperationalPaydunyaError(error, 'create');
  }

  await markOrderPendingPayment(orderId);

  const payment = await upsertPaymentForTarget({
    orderId,
    userId: user.id,
    amount: value,
    reference: invoice.token,
    transactionId: invoice.token,
    status: 'PENDING',
  });

  return {
    payment,
    invoiceUrl: invoice.invoiceUrl,
    token: invoice.token,
  };
};

const verifyPaymentRecord = async (payment) => {
  if (!payment) return null;

  if (String(payment.method || '').toUpperCase() !== 'PAYDUNYA') {
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
    res.status(200).json(payments);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/create
 * Cree une facture PayDunya pour une reservation
 */
router.post('/create', authenticate, async (req, res, next) => {
  try {
    const { bookingId, orderId, amount, customerName, customerEmail, successUrl, cancelUrl } = req.body;

    if (!bookingId && !orderId) {
      return res.status(400).json({ status: 'error', message: 'bookingId ou orderId requis' });
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

      const lockKey = buildInvoiceLockKey({
        type: target.type,
        id: target.id,
        userId: req.user.id,
      });

      const invoiceResult = await runSingleFlightInvoiceCreation({
        lockKey,
        task: async () => (target.type === 'ORDER'
          ? createPaydunyaPaymentForOrder({
              orderId: target.id,
              amount,
              customerName,
              customerEmail,
              successUrl,
              cancelUrl,
              user: req.user,
            })
          : createPaydunyaPaymentForBooking({
              bookingId: target.id,
              amount,
              customerName,
              customerEmail,
              successUrl,
              cancelUrl,
              user: req.user,
            })),
      });

      return { invoiceResult, target };
    })(), 'payments/create');

    res.status(200).json({
      status: 'success',
      message: 'Facture PayDunya creee',
      data: {
        paymentId: result.invoiceResult.payment.id,
        bookingId: result.target.type === 'APPOINTMENT' ? result.target.id : null,
        orderId: result.target.type === 'ORDER' ? result.target.id : null,
        invoiceUrl: result.invoiceResult.invoiceUrl,
        token: result.invoiceResult.token,
        provider: 'PAYDUNYA',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/init
 * Compatibilite ancienne API (redirige vers PAYDUNYA)
 */
router.post('/init', authenticate, async (req, res, next) => {
  try {
    const { provider, amount, bookingId, orderId, customerName, customerEmail, successUrl, cancelUrl } = req.body;
    const normalizedProvider = String(provider || '').toUpperCase();

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

    const lockKey = buildInvoiceLockKey({
      type: target.type,
      id: target.id,
      userId: req.user.id,
    });

    const result = await withRouteTimeout(runSingleFlightInvoiceCreation({
      lockKey,
      task: async () => (target.type === 'ORDER'
        ? createPaydunyaPaymentForOrder({
            orderId: target.id,
            amount,
            customerName,
            customerEmail,
            successUrl,
            cancelUrl,
            user: req.user,
          })
        : createPaydunyaPaymentForBooking({
            bookingId: target.id,
            amount,
            customerName,
            customerEmail,
            successUrl,
            cancelUrl,
            user: req.user,
          })),
    }), 'payments/init');

    res.status(200).json({
      status: 'success',
      message: 'Paiement PayDunya initialise',
      data: {
        paymentId: result.payment.id,
        bookingId: target.type === 'APPOINTMENT' ? target.id : null,
        orderId: target.type === 'ORDER' ? target.id : null,
        checkoutUrl: result.invoiceUrl,
        invoiceUrl: result.invoiceUrl,
        token: result.token,
        provider: 'PAYDUNYA',
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
 * Verifie un paiement PayDunya d'une reservation
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

    const verified = await verifyPaymentRecord(payment);

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
        appointment: true,
      },
    });

    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Paiement non trouve',
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
      include: { appointment: true },
    });
    if (!payment) {
      return res.status(404).json({ status: 'error', message: 'Paiement introuvable' });
    }
    if (payment.appointmentId) {
      const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
      if (!salon || payment.appointment?.salonId !== salon.id) {
        return res.status(403).json({ status: 'error', message: 'Acces interdit' });
      }
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

/**
 * POST /api/payments/wave/create
 * Creer un paiement Wave Checkout
 */
router.post('/wave/create', authenticate, async (req, res, next) => {
  try {
    const { bookingId, orderId, amount, customerPhone } = req.body;

    if (!bookingId && !orderId) {
      return res.status(400).json({ status: 'error', message: 'bookingId ou orderId requis' });
    }

    const target = await resolvePaymentTarget({
      bookingId,
      orderId,
      userId: req.user.id,
    });
    if (!target) {
      return res.status(404).json({ status: 'error', message: 'Reservation ou commande introuvable' });
    }

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ status: 'error', message: 'Montant invalide' });
    }

    const reference = generateReference();
    const phone = String(customerPhone || req.user.phoneNumber || req.user.phone || '').trim();

    const waveResult = await initiateWavePayment({
      amount: value,
      phoneNumber: phone,
      reference,
      description: target.type === 'ORDER'
        ? `Commande StyleFlow #${target.id.slice(0, 8)}`
        : `Reservation StyleFlow #${target.id.slice(0, 8)}`,
    });

    const payment = await upsertPaymentForTarget({
      appointmentId: target.type === 'APPOINTMENT' ? target.id : null,
      orderId: target.type === 'ORDER' ? target.id : null,
      userId: req.user.id,
      amount: value,
      reference,
      transactionId: waveResult.transactionId,
      status: 'PENDING',
    });

    if (target.type === 'APPOINTMENT') {
      await markAppointmentPendingPayment(target.id);
    } else {
      await markOrderPendingPayment(target.id);
    }

    res.status(200).json({
      status: 'success',
      message: 'Paiement Wave initie',
      data: {
        paymentId: payment.id,
        bookingId: target.type === 'APPOINTMENT' ? target.id : null,
        orderId: target.type === 'ORDER' ? target.id : null,
        checkoutUrl: waveResult.checkoutUrl,
        transactionId: waveResult.transactionId,
        provider: 'WAVE',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/wave/webhook
 * Webhook IPN Wave (callback apres paiement)
 */
router.post('/wave/webhook', async (req, res) => {
  try {
    const { client_reference, payment_status, id: waveSessionId } = req.body;

    if (!client_reference) {
      return res.status(400).json({ status: 'error', message: 'Reference manquante' });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { reference: client_reference },
          { transactionId: waveSessionId },
        ],
      },
    });

    if (!payment) {
      return res.status(404).json({ status: 'error', message: 'Paiement introuvable' });
    }

    if (String(payment.status || '').toUpperCase() === 'COMPLETED') {
      return res.status(200).json({ status: 'success', message: 'Deja traite' });
    }

    if (payment_status === 'succeeded') {
      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          transactionId: waveSessionId || payment.transactionId,
        },
      });

      await markAppointmentPaid(updated.appointmentId);
      await markOrderPaid(updated.orderId);
      await notifyPaymentCompleted(updated);
    }

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Wave webhook error:', error.message);
    return res.status(500).json({ status: 'error', message: 'Erreur traitement webhook' });
  }
});

module.exports = router;
