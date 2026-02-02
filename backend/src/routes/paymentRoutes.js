const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// Mode de paiement : TEST ou PRODUCTION
const PAYMENTS_MODE = process.env.PAYMENTS_MODE || 'TEST';

// Méthodes de paiement autorisées - MVP
const ALLOWED_PROVIDERS = ['ORANGE_MONEY', 'WAVE', 'PAY_ON_SITE'];

/**
 * Générer une référence unique
 */
const generateReference = () => {
  return 'FRV-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
};

/**
 * Simuler un paiement en mode TEST
 */
const simulatePayment = async (provider, amount, reference) => {
  // Simuler un délai de traitement
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    transactionId: `${provider}-TEST-${Date.now()}`,
    status: 'PENDING',
    mockCheckoutUrl: provider !== 'PAY_ON_SITE' ? `mock://payment/${reference}` : null,
    message: PAYMENTS_MODE === 'TEST' 
      ? `[MODE TEST] Paiement ${provider} simulé` 
      : `Paiement ${provider} initié`,
  };
};

/**
 * POST /api/payments/init
 * Initier un paiement (Orange Money ou Wave)
 */
router.post('/init', authenticate, async (req, res, next) => {
  try {
    const { provider, amount, phoneNumber, bookingId } = req.body;

    // Validation du provider
    if (!provider) {
      return res.status(400).json({
        status: 'error',
        message: 'Provider de paiement requis',
      });
    }

    const normalizedProvider = provider.toUpperCase();
    
    // Vérifier que le provider est autorisé
    if (!ALLOWED_PROVIDERS.includes(normalizedProvider)) {
      return res.status(400).json({
        status: 'error',
        message: `Méthode de paiement non autorisée. Méthodes acceptées: ${ALLOWED_PROVIDERS.join(', ')}`,
      });
    }

    // PAY_ON_SITE doit utiliser l'endpoint dédié
    if (normalizedProvider === 'PAY_ON_SITE') {
      return res.status(400).json({
        status: 'error',
        message: 'Utilisez /api/payments/confirm-on-site pour le paiement sur place',
      });
    }

    // Validation du montant
    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Montant invalide',
      });
    }

    // Validation du numéro de téléphone pour les paiements mobiles
    if (!phoneNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Numéro de téléphone requis pour les paiements mobiles',
      });
    }

    // Générer une référence unique
    const reference = generateReference();

    let paymentResult;

    // Mode TEST : simuler le paiement
    if (PAYMENTS_MODE === 'TEST') {
      console.log(`🧪 [TEST MODE] Paiement ${normalizedProvider} initié:`, { amount, phoneNumber, reference });
      paymentResult = await simulatePayment(normalizedProvider, amount, reference);
    } else {
      // Mode PRODUCTION : appeler les vrais APIs
      // TODO: Intégrer les APIs Wave et Orange Money réels
      paymentResult = await simulatePayment(normalizedProvider, amount, reference);
    }

    // Créer l'enregistrement de paiement dans la base de données
    const payment = await prisma.payment.create({
      data: {
        transactionId: paymentResult.transactionId,
        amount: amount,
        fees: 0,
        totalAmount: amount,
        currency: 'XOF',
        method: normalizedProvider,
        status: 'PENDING',
        reference: reference,
        phoneNumber: phoneNumber,
        appointmentId: bookingId || null,
        userId: req.user.id,
      },
    });

    res.status(200).json({
      status: 'success',
      message: paymentResult.message,
      data: {
        paymentId: payment.id,
        reference: reference,
        transactionId: paymentResult.transactionId,
        mockCheckoutUrl: paymentResult.mockCheckoutUrl,
        amount: amount,
        provider: normalizedProvider,
        paymentStatus: paymentResult.status,
        testMode: PAYMENTS_MODE === 'TEST',
      },
    });
  } catch (error) {
    console.error('Payment init error:', error);
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

    // Générer une référence unique
    const reference = generateReference();

    // Créer l'enregistrement de paiement
    const payment = await prisma.payment.create({
      data: {
        transactionId: `ONSITE-${Date.now()}`,
        amount: amount || 0,
        fees: 0,
        totalAmount: amount || 0,
        currency: 'XOF',
        method: 'PAY_ON_SITE',
        status: 'ON_SITE',
        reference: reference,
        phoneNumber: null,
        appointmentId: bookingId || null,
        userId: req.user.id,
      },
    });

    // Si un bookingId est fourni, mettre à jour le statut de la réservation
    if (bookingId) {
      await prisma.appointment.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED_ON_SITE' },
      }).catch(() => {
        // Ignorer si la réservation n'existe pas encore
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Réservation confirmée. Paiement à effectuer au salon.',
      data: {
        paymentId: payment.id,
        reference: reference,
        status: 'ON_SITE',
        provider: 'PAY_ON_SITE',
      },
    });
  } catch (error) {
    console.error('Confirm on-site error:', error);
    next(error);
  }
});

/**
 * GET /api/payments/:id/status
 * Vérifier le statut d'un paiement
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
        message: 'Paiement non trouvé',
      });
    }

    // En mode TEST, simuler la confirmation après quelques vérifications
    if (PAYMENTS_MODE === 'TEST' && payment.status === 'PENDING') {
      // Simuler la confirmation automatique pour les tests
      const updatedPayment = await prisma.payment.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      // Mettre à jour le statut du rendez-vous si lié
      if (payment.appointmentId) {
        await prisma.appointment.update({
          where: { id: payment.appointmentId },
          data: { status: 'CONFIRMED' },
        }).catch(() => {});
      }

      return res.status(200).json({
        status: 'success',
        data: { 
          payment: updatedPayment,
          testMode: true,
          message: '[TEST MODE] Paiement automatiquement confirmé',
        },
      });
    }

    res.status(200).json({
      status: 'success',
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/me
 * Historique des paiements de l'utilisateur connecté
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

/**
 * Webhook Wave (pour production future)
 * POST /api/payments/webhook/wave
 */
router.post('/webhook/wave', async (req, res) => {
  try {
    const { id, payment_status, client_reference } = req.body;

    console.log('Wave webhook received:', req.body);

    if (payment_status === 'succeeded') {
      const payment = await prisma.payment.findFirst({
        where: { reference: client_reference },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });

        if (payment.appointmentId) {
          await prisma.appointment.update({
            where: { id: payment.appointmentId },
            data: { status: 'CONFIRMED' },
          });
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Wave webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Webhook Orange Money (pour production future)
 * POST /api/payments/webhook/orange-money
 */
router.post('/webhook/orange-money', async (req, res) => {
  try {
    const { status, order_id, txn_id } = req.body;

    console.log('Orange Money webhook received:', req.body);

    if (status === 'SUCCESS') {
      const payment = await prisma.payment.findFirst({
        where: { reference: order_id },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { 
            status: 'COMPLETED', 
            completedAt: new Date(),
            transactionId: txn_id,
          },
        });

        if (payment.appointmentId) {
          await prisma.appointment.update({
            where: { id: payment.appointmentId },
            data: { status: 'CONFIRMED' },
          });
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Orange Money webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
