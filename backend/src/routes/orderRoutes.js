const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { pushNotification } = require('../realtime/hub');
const { sendOrderConfirmationEmail } = require('../services/emailService');

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
    } = req.body;

    if (!salonId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Boutique et articles requis',
      });
    }

    // Verify boutique exists
    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
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
    const normalizedPaymentMethod = String(paymentMethod || '').toUpperCase();
    const isPaydunyaFlow = normalizedPaymentMethod === 'PAYDUNYA';
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
          status: isPaydunyaFlow ? 'PENDING_PAYMENT' : 'PENDING',
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

      // Decrement stock
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
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
            message: isPaydunyaFlow
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
            message: isPaydunyaFlow
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
    if (!isPaydunyaFlow && order.client?.email) {
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
      message: isPaydunyaFlow
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
 * PATCH /api/orders/:id/status
 * Update order status (boutique owner or admin)
 */
router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
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
      ['PENDING', 'CONFIRMED'].includes(String(order.status || '').toUpperCase());

    // Only boutique owner/admin can change status, except restricted client cancellation
    const isOwner = order.salon?.ownerId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    if (!isOwner && !isAdmin && !clientCanCancel) {
      return res.status(403).json({ status: 'error', message: 'Accès interdit' });
    }

    // If cancelling, restore stock
    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      const items = await prisma.orderItem.findMany({ where: { orderId: id } });
      await prisma.$transaction(
        items.map((item) =>
          prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        )
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: { include: { product: true } },
        client: { select: { id: true, name: true, email: true, phoneNumber: true } },
        salon: { select: { id: true, name: true } },
      },
    });

    // Notify client of status change
    if (updated.clientId) {
      const statusLabels = {
        CONFIRMED: 'confirmée',
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

module.exports = router;
