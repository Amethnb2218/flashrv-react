const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { pushNotification } = require('../realtime/hub');
const { sendOrderConfirmationEmail } = require('../services/emailService');
const { uploadPaymentProof } = require('../config/cloudinary');
const { commitOrderStockIfNeeded, isStockCommittedStatus, restoreOrderStockIfNeeded } = require('../utils/orderStock');

const DIRECT_MOBILE_METHODS = new Set(['ORANGE_MONEY', 'WAVE', 'FREE_MONEY']);
const ORANGE_MONEY_REFERENCE_REGEX = /^MP\d{6}\.\d{4}\.C\d{5}$/i;
const ALLOWED_PAYMENT_METHODS = new Set([
  'DEXPAY',
  'PAYTECH',
  'PAYDUNYA',
  'PAY_ON_PICKUP',
  'CASH_ON_DELIVERY',
  'PAY_ON_SITE',
  'CASH',
  ...DIRECT_MOBILE_METHODS,
]);
const DEXPAY_MIN_ORDER_AMOUNT = 1200;

const cleanString = (value, max = 220) => {
  if (value == null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.slice(0, max);
};

const normalizeOrderPaymentMethod = (value) => {
  const raw = cleanString(value, 40);
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper === 'PAY_ON_PICKUP' || upper === 'PAYONPICKUP') return 'PAY_ON_PICKUP';
  if (upper === 'CASH_ON_DELIVERY' || upper === 'CASHONDELIVERY') return 'CASH_ON_DELIVERY';
  if (upper === 'PAY_ON_SITE' || upper === 'PAYONSITE') return 'PAY_ON_SITE';
  if (upper === 'PAYDUNYA' || upper === 'PAYTECH') return 'DEXPAY';
  return upper;
};

const buildPaymentReference = (prefix = 'ORDPAY') =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const toFriendlyPaymentMethodLabel = (method) => {
  const key = String(method || '').toUpperCase();
  if (key === 'DEXPAY' || key === 'PAYTECH' || key === 'PAYDUNYA') return 'DexPay';
  if (key === 'ORANGE_MONEY') return 'Orange Money';
  if (key === 'WAVE') return 'Wave';
  if (key === 'FREE_MONEY') return 'Free Money';
  if (key === 'PAY_ON_PICKUP') return 'Paiement au retrait';
  if (key === 'CASH_ON_DELIVERY') return 'Paiement a la livraison';
  if (key === 'PAY_ON_SITE') return 'Paiement au salon';
  if (key === 'CASH') return 'Especes';
  return key || 'Paiement';
};

/**
 * POST /api/orders
 * Create an order (client purchasing from a boutique)
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      salonId,
      items, // [{ productId, quantity }]
      notes,
      deliveryMode,
      deliveryAddress,
      clientPhone,
      clientName,
      paymentMethod,
      checkoutAmount,
    } = req.body;

    if (!salonId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Boutique et articles requis',
      });
    }

    // Verify boutique exists
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      include: {
        paymentMethods: {
          where: { enabled: true },
          select: {
            method: true,
            phoneNumber: true,
            qrCodeUrl: true,
            requiresProof: true,
          },
        },
      },
    });
    if (!salon || salon.businessType !== 'BOUTIQUE') {
      return res.status(400).json({
        status: 'error',
        message: 'Boutique introuvable',
      });
    }

    // Fetch products & validate
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, salonId, isActive: true },
    });
    if (products.length !== productIds.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Un ou plusieurs produits introuvables ou inactifs',
      });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    const normalizedDeliveryMode = String(deliveryMode || 'PICKUP').toUpperCase() === 'DELIVERY'
      ? 'DELIVERY'
      : 'PICKUP';
    const normalizedPaymentMethod = normalizeOrderPaymentMethod(paymentMethod);
    if (normalizedPaymentMethod && !ALLOWED_PAYMENT_METHODS.has(normalizedPaymentMethod)) {
      return res.status(400).json({
        status: 'error',
        message: 'Methode de paiement invalide.',
      });
    }
    const isDexPayFlow = normalizedPaymentMethod === 'DEXPAY';
    const isDirectMobilePayment = DIRECT_MOBILE_METHODS.has(normalizedPaymentMethod);
    const requiresClientPayment = isDexPayFlow || isDirectMobilePayment;

    if (isDirectMobilePayment) {
      const enabledMethods = Array.isArray(salon?.paymentMethods) ? salon.paymentMethods : [];
      const targetMethod = enabledMethods.find(
        (item) => String(item.method || '').toUpperCase() === normalizedPaymentMethod
      );
      if (!targetMethod) {
        return res.status(400).json({
          status: 'error',
          message: `La boutique n a pas active ${toFriendlyPaymentMethodLabel(normalizedPaymentMethod)}.`,
        });
      }
    }
    if (normalizedDeliveryMode === 'DELIVERY' && !String(deliveryAddress || '').trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Adresse de livraison requise.',
      });
    }
    if (normalizedDeliveryMode === 'DELIVERY') {
      const nonDeliverable = products.find((p) => p.isDeliverable !== true);
      if (nonDeliverable) {
        return res.status(400).json({
          status: 'error',
          message: `Le produit "${nonDeliverable.name}" est uniquement disponible en retrait.`,
        });
      }
    }

    // Check stock and calculate total
    let totalPrice = 0;
    const orderItems = [];
    for (const item of items) {
      const product = productMap.get(item.productId);
      const qty = parseInt(item.quantity, 10) || 1;
      if (product.stock < qty) {
        return res.status(400).json({
          status: 'error',
          message: `Stock insuffisant pour "${product.name}" (disponible: ${product.stock})`,
        });
      }
      totalPrice += product.price * qty;
      orderItems.push({
        productId: product.id,
        quantity: qty,
        unitPrice: product.price,
      });
    }

    if (isDexPayFlow) {
      const submittedCheckoutAmount = Number(checkoutAmount);
      const effectiveCheckoutAmount = Number.isFinite(submittedCheckoutAmount) && submittedCheckoutAmount > 0
        ? submittedCheckoutAmount
        : totalPrice;
      if (effectiveCheckoutAmount < DEXPAY_MIN_ORDER_AMOUNT) {
        return res.status(400).json({
          status: 'error',
          message: `Le paiement DexPay est disponible a partir de ${DEXPAY_MIN_ORDER_AMOUNT} FCFA pour cette commande.`,
        });
      }
    }

    // Create order + items + decrement stock in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          clientId: req.user.id,
          salonId,
          totalPrice,
          notes: notes || null,
          deliveryMode: normalizedDeliveryMode,
          deliveryAddress: normalizedDeliveryMode === 'DELIVERY' ? (deliveryAddress || null) : null,
          clientPhone: clientPhone || null,
          clientName: clientName || req.user.name || null,
          paymentMethod: normalizedPaymentMethod || null,
          status: requiresClientPayment ? 'PENDING_PAYMENT' : 'PENDING',
          items: {
            create: orderItems,
          },
        },
        include: {
          items: { include: { product: true } },
          salon: { select: { id: true, name: true, ownerId: true } },
          client: { select: { id: true, name: true, email: true, phoneNumber: true } },
        },
      });

      if (!requiresClientPayment) {
        for (const item of orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      return newOrder;
    });

    // Notify boutique owner
    if (order.salon?.ownerId && order.salon.ownerId !== req.user.id) {
      try {
        const notification = await prisma.notification.create({
          data: {
            userId: order.salon.ownerId,
            type: 'order',
            message: requiresClientPayment
              ? `Nouvelle commande de ${order.clientName || 'un client'} en attente de paiement - ${totalPrice} FCFA`
              : `Nouvelle commande de ${order.clientName || 'un client'} - ${totalPrice} FCFA`,
          },
        });
        pushNotification(notification.userId, notification);
      } catch (e) {
        console.error('Notification order error:', e.message);
      }
    }

    // Notify client confirmation for in-app notifications
    if (order.clientId) {
      try {
        const notification = await prisma.notification.create({
          data: {
            userId: order.clientId,
            type: 'order',
            message: requiresClientPayment
              ? `Votre commande chez ${order.salon?.name || 'la boutique'} est en attente de paiement.`
              : `Votre commande chez ${order.salon?.name || 'la boutique'} est confirmee.`,
          },
        });
        pushNotification(notification.userId, notification);
      } catch (e) {
        console.error('Notification client order create error:', e.message);
      }
    }

    // Send confirmation email to client
    if (!requiresClientPayment && order.client?.email) {
      sendOrderConfirmationEmail({
        to: order.client.email,
        clientName: order.clientName || order.client.name || 'Client',
        boutiqueName: order.salon?.name || 'la boutique',
        items: order.items || [],
        totalPrice,
        deliveryMode: order.deliveryMode,
      }).catch(() => {});
    }

    res.status(201).json({
      status: 'success',
      message: requiresClientPayment
        ? 'Commande creee. Paiement requis pour confirmation.'
        : 'Commande creee avec succes',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders
 * Get orders for the current user (client: their orders, PRO: their boutique orders)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, asClient } = req.query;
    const userId = req.user.id;
    let where = {};

    const forceClient = String(asClient || '').toLowerCase() === 'true';

    if (forceClient || req.user.role === 'CLIENT') {
      where.clientId = userId;
    } else if (req.user.role === 'PRO') {
      const salon = await prisma.salon.findFirst({ where: { ownerId: userId } });
      if (salon) {
        where.salonId = salon.id;
      } else {
        where.clientId = userId;
      }
    } else if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      // admin sees all
    } else {
      where.clientId = userId;
    }

    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { product: { select: { id: true, name: true, price: true, imageUrl: true } } } },
        client: { select: { id: true, name: true, email: true, phoneNumber: true } },
        salon: { select: { id: true, name: true, image: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ data: orders });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/orders/:id/payment-proof
 * Client submits direct mobile payment proof (Orange/Wave/Free)
 */
router.post('/:id/payment-proof', authenticate, uploadPaymentProof.single('proof'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const normalizedMethod = normalizeOrderPaymentMethod(req.body?.paymentMethod);
    const payerPhone = cleanString(req.body?.payerPhone, 40);
    const proofReference = cleanString(req.body?.proofReference, 120);
    const proofNote = cleanString(req.body?.proofNote, 400);
    const proofAmountRaw = req.body?.proofAmount;
    const proofAmount = Number(proofAmountRaw);

    if (!normalizedMethod || !DIRECT_MOBILE_METHODS.has(normalizedMethod)) {
      return res.status(400).json({
        status: 'error',
        message: 'Choisissez un moyen de paiement mobile valide (Orange Money, Wave, Free Money).',
      });
    }
    if (!proofReference) {
      return res.status(400).json({
        status: 'error',
        message: 'La reference transaction est obligatoire.',
      });
    }
    if (normalizedMethod === 'ORANGE_MONEY') {
      const normalizedOmReference = String(proofReference).toUpperCase();
      if (!ORANGE_MONEY_REFERENCE_REGEX.test(normalizedOmReference)) {
        return res.status(400).json({
          status: 'error',
          message: 'Reference Orange Money invalide. Format attendu: MP260313.2207.C03995 (20 caracteres).',
        });
      }
    }
    if (!payerPhone) {
      return res.status(400).json({
        status: 'error',
        message: 'Le numero de l envoyeur est obligatoire.',
      });
    }
    if (!Number.isFinite(proofAmount) || proofAmount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Le montant envoye est invalide.',
      });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
        salon: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            paymentMethods: {
              where: { enabled: true },
              select: {
                method: true,
                phoneNumber: true,
                displayName: true,
                requiresProof: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Commande introuvable' });
    }
    if (order.clientId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Acces interdit' });
    }

    const orderStatus = String(order.status || '').toUpperCase();
    if (['CANCELLED', 'DELIVERED'].includes(orderStatus)) {
      return res.status(400).json({
        status: 'error',
        message: 'Cette commande ne peut plus recevoir de preuve de paiement.',
      });
    }

    const activeMethod = (order.salon?.paymentMethods || []).find(
      (item) => String(item.method || '').toUpperCase() === normalizedMethod
    );
    if (!activeMethod) {
      return res.status(400).json({
        status: 'error',
        message: `Ce moyen de paiement n est pas actif chez ${order.salon?.name || 'la boutique'}.`,
      });
    }

    if (
      String(order.payment?.status || '').toUpperCase() === 'COMPLETED' &&
      String(order.payment?.proofStatus || '').toUpperCase() === 'APPROVED'
    ) {
      return res.status(409).json({
        status: 'error',
        message: 'Le paiement est deja valide pour cette commande.',
      });
    }

    const hasUploadedProof = !!req.file;
    const proofUrl = hasUploadedProof ? (req.file.path || req.file.secure_url || req.file.url || null) : null;
    if (hasUploadedProof && !proofUrl) {
      return res.status(500).json({ status: 'error', message: 'Impossible de lire la capture envoyee.' });
    }

    const now = new Date();
    const reference = order.payment?.reference || buildPaymentReference('PMAN');
    const normalizedProofReference = normalizedMethod === 'ORANGE_MONEY'
      ? String(proofReference).toUpperCase()
      : proofReference;
    const transactionId = normalizedProofReference;
    const nextProofImageUrl = proofUrl || order.payment?.proofImageUrl || null;
    const nextProofReference = normalizedProofReference;
    const nextProofNote = proofNote || order.payment?.proofNote || null;

    const { payment: savedPayment } = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.upsert({
        where: { orderId: id },
        update: {
          method: normalizedMethod,
          manualMethod: normalizedMethod,
          manualRecipient: activeMethod.phoneNumber || activeMethod.displayName || null,
          phoneNumber: payerPhone,
          amount: proofAmount,
          fees: 0,
          totalAmount: proofAmount,
          currency: 'XOF',
          status: 'PENDING',
          transactionId,
          proofImageUrl: nextProofImageUrl,
          proofReference: nextProofReference,
          proofNote: nextProofNote,
          proofStatus: 'PENDING',
          proofSubmittedAt: now,
          proofReviewedAt: null,
          proofReviewedBy: null,
          proofRejectionReason: null,
          completedAt: null,
          reference,
          userId: order.clientId,
        },
        create: {
          orderId: id,
          method: normalizedMethod,
          manualMethod: normalizedMethod,
          manualRecipient: activeMethod.phoneNumber || activeMethod.displayName || null,
          phoneNumber: payerPhone,
          amount: proofAmount,
          fees: 0,
          totalAmount: proofAmount,
          currency: 'XOF',
          status: 'PENDING',
          transactionId,
          reference,
          proofImageUrl: nextProofImageUrl,
          proofReference: nextProofReference,
          proofNote: nextProofNote,
          proofStatus: 'PENDING',
          proofSubmittedAt: now,
          userId: order.clientId,
        },
      });

      await tx.order.update({
        where: { id },
        data: {
          status: 'PENDING_PAYMENT',
          paymentMethod: normalizedMethod,
        },
      });

      return { payment };
    });

    if (order.salon?.ownerId) {
      try {
        const notification = await prisma.notification.create({
          data: {
            userId: order.salon.ownerId,
            type: 'order',
            message: proofUrl
              ? `Preuve de paiement recue pour la commande ${id.slice(-8).toUpperCase()} (${toFriendlyPaymentMethodLabel(normalizedMethod)}).`
              : `Paiement a verifier pour la commande ${id.slice(-8).toUpperCase()} (${toFriendlyPaymentMethodLabel(normalizedMethod)}).`,
          },
        });
        pushNotification(notification.userId, notification);
      } catch (e) {
        console.error('Order payment proof notify owner error:', e.message);
      }
    }

    try {
      const notification = await prisma.notification.create({
        data: {
          userId: order.clientId,
          type: 'order',
          message: proofUrl
            ? `Preuve de paiement envoyee. La boutique ${order.salon?.name || ''} va verifier votre paiement.`
            : `Demande de verification envoyee. La boutique ${order.salon?.name || ''} va verifier votre paiement.`,
        },
      });
      pushNotification(notification.userId, notification);
    } catch (e) {
      console.error('Order payment proof notify client error:', e.message);
    }

    return res.status(200).json({
      status: 'success',
      message: proofUrl
        ? 'Preuve de paiement envoyee avec succes.'
        : 'Demande de verification de paiement envoyee avec succes.',
      data: {
        orderId: id,
        payment: savedPayment,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/orders/:id/payment-proof/review
 * Boutique owner reviews direct mobile payment proof
 */
router.patch('/:id/payment-proof/review', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const decisionRaw = cleanString(req.body?.decision || req.body?.action || req.body?.status, 20);
    const decision = String(decisionRaw || '').toUpperCase();
    const rejectionReason = cleanString(req.body?.reason || req.body?.rejectionReason, 260);
    if (!['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({
        status: 'error',
        message: 'Decision invalide. Utilisez APPROVE ou REJECT.',
      });
    }
    if (decision === 'REJECT' && !rejectionReason) {
      return res.status(400).json({
        status: 'error',
        message: 'Le motif du rejet est obligatoire pour ouvrir un litige.',
      });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
        salon: { select: { id: true, ownerId: true, name: true } },
        client: { select: { id: true, name: true, email: true } },
        items: { include: { product: { select: { id: true, name: true, price: true } } } },
      },
    });
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Commande introuvable' });
    }

    const isOwner = order.salon?.ownerId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ status: 'error', message: 'Acces interdit' });
    }

    if (!order.payment) {
      return res.status(400).json({
        status: 'error',
        message: 'Aucune information de paiement a verifier pour cette commande.',
      });
    }
    const reviewPaymentMethod = normalizeOrderPaymentMethod(
      order.payment?.manualMethod || order.payment?.method || order.paymentMethod
    );
    if (!reviewPaymentMethod || !DIRECT_MOBILE_METHODS.has(reviewPaymentMethod)) {
      return res.status(400).json({
        status: 'error',
        message: 'Cette commande n utilise pas un paiement mobile direct a verifier.',
      });
    }

    const now = new Date();
    const approve = decision === 'APPROVE';
    const updatedPayment = await prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        status: approve ? 'COMPLETED' : 'FAILED',
        proofStatus: approve ? 'APPROVED' : 'REJECTED',
        proofReviewedAt: now,
        proofReviewedBy: req.user.id,
        proofRejectionReason: approve ? null : rejectionReason,
        completedAt: approve ? now : null,
      },
    });

    const currentOrderStatus = String(order.status || '').toUpperCase();
    const shouldMoveToConfirmed = approve && ['PENDING', 'PENDING_PAYMENT', 'DISPUTED'].includes(currentOrderStatus);
    const shouldMoveToDisputed = !approve && ['PENDING', 'PENDING_PAYMENT', 'DISPUTED'].includes(currentOrderStatus);
    const updatedOrder = shouldMoveToConfirmed
      ? await commitOrderStockIfNeeded(id)
      : await prisma.order.update({
          where: { id },
          data: {
            status: shouldMoveToDisputed ? 'DISPUTED' : order.status,
          },
        });

    if (order.clientId) {
      try {
        const notification = await prisma.notification.create({
          data: {
            userId: order.clientId,
            type: 'order',
            message: approve
              ? `Paiement valide pour votre commande chez ${order.salon?.name || 'la boutique'}.`
              : `Paiement conteste par ${order.salon?.name || 'la boutique'}. Litige en cours de verification.`,
          },
        });
        pushNotification(notification.userId, notification);
      } catch (e) {
        console.error('Order payment review notify client error:', e.message);
      }
    }

    if (!approve) {
      try {
        const admins = await prisma.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
          select: { id: true },
        });
        if (admins.length > 0) {
          const notifications = await prisma.$transaction(
            admins.map((admin) =>
              prisma.notification.create({
                data: {
                  userId: admin.id,
                  type: 'order',
                  message: `Litige paiement: commande ${id.slice(-8).toUpperCase()} a verifier (${order.salon?.name || 'Boutique'}).`,
                },
              })
            )
          );
          notifications.forEach((notif) => pushNotification(notif.userId, notif));
        }
      } catch (e) {
        console.error('Order payment dispute notify admins error:', e.message);
      }
    }

    if (approve && order.client?.email) {
      sendOrderConfirmationEmail({
        to: order.client.email,
        clientName: order.clientName || order.client.name || 'Client',
        boutiqueName: order.salon?.name || 'la boutique',
        items: order.items || [],
        totalPrice: order.totalPrice || 0,
        deliveryMode: order.deliveryMode,
      }).catch(() => {});
    }

    return res.status(200).json({
      status: 'success',
      message: approve ? 'Paiement valide.' : 'Paiement conteste. Litige ouvert.',
      data: {
        order: updatedOrder,
        payment: updatedPayment,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/orders/:id/status
 * Update order status (boutique owner or admin)
 */
router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'PENDING_PAYMENT', 'DISPUTED', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Statut invalide' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { salon: { select: { ownerId: true, name: true } } },
    });
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Commande introuvable' });
    }

    const isClient = order.clientId === req.user.id;
    const clientCanCancel =
      isClient &&
      status === 'CANCELLED' &&
      ['PENDING', 'PENDING_PAYMENT', 'DISPUTED', 'CONFIRMED'].includes(String(order.status || '').toUpperCase());

    // Only boutique owner/admin can change status, except restricted client cancellation
    const isOwner = order.salon?.ownerId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    if (!isOwner && !isAdmin && !clientCanCancel) {
      return res.status(403).json({ status: 'error', message: 'Accès interdit' });
    }

    let updated;
    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      await restoreOrderStockIfNeeded(id);
      updated = await prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          client: { select: { id: true, name: true, email: true, phoneNumber: true } },
          salon: { select: { id: true, name: true, ownerId: true } },
        },
      });
    } else if (status === 'CONFIRMED' && !isStockCommittedStatus(order.status)) {
      await commitOrderStockIfNeeded(id);
      updated = await prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          client: { select: { id: true, name: true, email: true, phoneNumber: true } },
          salon: { select: { id: true, name: true, ownerId: true } },
        },
      });
    } else {
      updated = await prisma.order.update({
        where: { id },
        data: { status },
        include: {
          items: { include: { product: true } },
          client: { select: { id: true, name: true, email: true, phoneNumber: true } },
          salon: { select: { id: true, name: true, ownerId: true } },
        },
      });
    }

    // Notify client of status change
    if (updated.clientId) {
      const statusLabels = {
        CONFIRMED: 'confirmée',
        DISPUTED: 'en litige',
        PREPARING: 'en préparation',
        READY: 'prête',
        DELIVERED: 'livrée',
        CANCELLED: 'annulée',
      };
      const label = statusLabels[status] || status;
      try {
        const notification = await prisma.notification.create({
          data: {
            userId: updated.clientId,
            type: 'order',
            message: `Votre commande chez ${updated.salon?.name || 'la boutique'} est ${label}.`,
          },
        });
        pushNotification(notification.userId, notification);
      } catch (e) {
        console.error('Notification order status error:', e.message);
      }
    }

    // If cancellation came from client side, notify boutique owner
    if (status === 'CANCELLED' && isClient && updated.salon?.ownerId) {
      try {
        const notification = await prisma.notification.create({
          data: {
            userId: updated.salon.ownerId,
            type: 'order',
            message: `La commande de ${updated.clientName || updated.client?.name || 'un client'} a ete annulee.`,
          },
        });
        pushNotification(notification.userId, notification);
      } catch (e) {
        console.error('Notification owner cancel error:', e.message);
      }
    }

    res.json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders/:id
 * Get a single order
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        client: { select: { id: true, name: true, email: true, phoneNumber: true } },
        salon: { select: { id: true, name: true, ownerId: true } },
        payment: true,
      },
    });
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Commande introuvable' });
    }
    // Access check
    const isClient = order.clientId === req.user.id;
    const isOwner = order.salon?.ownerId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    if (!isClient && !isOwner && !isAdmin) {
      return res.status(403).json({ status: 'error', message: 'Accès interdit' });
    }
    res.json({ status: 'success', data: order });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/orders/:id
 * Remove a cancelled order from client history
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        salon: { select: { ownerId: true } },
        payment: true,
        items: { select: { id: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Commande introuvable' });
    }

    const isClient = order.clientId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    if (!isClient && !isAdmin) {
      return res.status(403).json({ status: 'error', message: 'Acces interdit' });
    }

    const status = String(order.status || '').toUpperCase();
    if (!['CANCELLED', 'DELIVERED'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Seules les commandes annulees ou livrees peuvent etre supprimees.',
      });
    }

    await prisma.$transaction(async (tx) => {
      if (order.payment?.id) {
        await tx.payment.delete({
          where: { id: order.payment.id },
        }).catch(() => {});
      }

      await tx.orderItem.deleteMany({
        where: { orderId: id },
      });

      await tx.order.delete({
        where: { id },
      });
    });

    return res.status(200).json({
      status: 'success',
      message: 'Commande supprimee de votre historique.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
