const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireApprovedPro } = require('../middleware/auth');
const { createPaydunyaInvoice, confirmPaydunyaInvoice } = require('../services/paydunyaService');
const { pushNotification } = require('../realtime/hub');

const router = express.Router();

const ALLOWED_PROVIDERS = ['PAYDUNYA', 'PAY_ON_SITE'];

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

const notifyPaymentCompleted = async (payment, bookingId) => {
  if (!payment?.userId) return;

  const appointment = bookingId
    ? await prisma.appointment.findUnique({
        where: { id: bookingId },
        include: {
          salon: { select: { name: true } },
        },
      }).catch(() => null)
    : null;

  const message = appointment
    ? `Paiement confirme pour votre reservation chez ${appointment.salon?.name || 'le salon'}.`
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
};

const upsertBookingPayment = async ({
  bookingId,
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
    appointmentId: bookingId || null,
    userId,
  };

  const existing = bookingId
    ? await prisma.payment.findFirst({ where: { appointmentId: bookingId } })
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
  const successUrl = `${frontendBase}/payment/success?appointmentId=${encodeURIComponent(bookingId)}`;
  const cancelUrl = `${frontendBase}/payment/cancel?appointmentId=${encodeURIComponent(bookingId)}`;
  const callbackUrl = `${backendBase}/api/paydunya/ipn`;

  const invoice = await createPaydunyaInvoice({
    amount: value,
    bookingId,
    customerName: customerName || user.name || 'Client StyleFlow',
    customerEmail: customerEmail || user.email || '',
    description: `Reservation ${booking.service?.name || 'Salon'} - ${booking.salon?.name || 'StyleFlow'}`,
    successUrl,
    cancelUrl,
    callbackUrl,
  });

  await markAppointmentPendingPayment(bookingId);

  const payment = await upsertBookingPayment({
    bookingId,
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

  const verification = await confirmPaydunyaInvoice(payment.reference || payment.transactionId);

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
    await notifyPaymentCompleted(updated, updated.appointmentId);
    return updated;
  }

  return payment;
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
    const { bookingId, amount, customerName, customerEmail } = req.body;

    if (!bookingId) {
      return res.status(400).json({ status: 'error', message: 'bookingId requis' });
    }

    const result = await createPaydunyaPaymentForBooking({
      bookingId,
      amount,
      customerName,
      customerEmail,
      user: req.user,
    });

    res.status(200).json({
      status: 'success',
      message: 'Facture PayDunya creee',
      data: {
        paymentId: result.payment.id,
        bookingId,
        invoiceUrl: result.invoiceUrl,
        token: result.token,
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
    const { provider, amount, bookingId, customerName, customerEmail } = req.body;
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

    const result = await createPaydunyaPaymentForBooking({
      bookingId,
      amount,
      customerName,
      customerEmail,
      user: req.user,
    });

    res.status(200).json({
      status: 'success',
      message: 'Paiement PayDunya initialise',
      data: {
        paymentId: result.payment.id,
        bookingId,
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
        appointmentId: bookingId,
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

module.exports = router;
