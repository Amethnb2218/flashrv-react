
const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin, requireSuperAdmin, ROLES, STATUS } = require('../middleware/auth');
const { sendProApprovedEmail, sendAdminPromotionEmail } = require('../services/emailService');
const { pushNotification } = require('../realtime/hub');
const { ensureSiteVisitStorage, isSiteVisitStorageError } = require('../services/siteVisitStorage');

const router = express.Router();
const DIRECT_MOBILE_METHODS = new Set(['ORANGE_MONEY', 'WAVE', 'FREE_MONEY']);

const cleanString = (value, max = 240) => {
  if (value == null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.slice(0, max);
};

async function getSiteVisitSummary() {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  try {
    await ensureSiteVisitStorage();

    const [total, today, uniqueVisitors] = await Promise.all([
      prisma.siteVisit.count(),
      prisma.siteVisit.count({
        where: {
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.siteVisit.findMany({
        distinct: ['visitorId'],
        select: { visitorId: true },
      }),
    ]);

    return {
      total,
      today,
      uniqueVisitors: uniqueVisitors.length,
    };
  } catch (error) {
    if (isSiteVisitStorageError(error)) {
      console.warn('[ADMIN_STATS] site_visits table unavailable, returning zeroed visit stats');
      return {
        total: 0,
        today: 0,
        uniqueVisitors: 0,
      };
    }

    throw error;
  }
}

async function deleteAppointmentsAndPayments(tx, where) {
  const appointments = await tx.appointment.findMany({
    where,
    select: { id: true },
  });
  const appointmentIds = appointments.map((appointment) => appointment.id);

  if (appointmentIds.length) {
    await tx.payment.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    await tx.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
  }
}

async function deleteOrdersAndPayments(tx, where) {
  const orders = await tx.order.findMany({
    where,
    select: { id: true },
  });
  const orderIds = orders.map((order) => order.id);

  if (orderIds.length) {
    await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.order.deleteMany({ where: { id: { in: orderIds } } });
  }
}
// ============================================
// SUPER_ADMIN ROUTES - Restriction PRO/ADMIN
// ============================================

/**
 * PATCH /admin/pro/:id/restrict
 * Restreindre les droits d'un PRO (SUPER_ADMIN only)
 */
router.patch('/pro/:id/restrict', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { canCreateService, canBook, isPublic } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== ROLES.PRO) {
      return res.status(404).json({ status: 'error', message: 'PRO not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        canCreateService: typeof canCreateService === 'boolean' ? canCreateService : user.canCreateService,
        canBook: typeof canBook === 'boolean' ? canBook : user.canBook,
        isPublic: typeof isPublic === 'boolean' ? isPublic : user.isPublic,
      },
      select: { id: true, email: true, name: true, role: true, canCreateService: true, canBook: true, isPublic: true },
    });
    console.log(`🔒 PRO restricted: ${updatedUser.email} by ${req.user.email}`);
    res.status(200).json({ status: 'success', data: { user: updatedUser } });
  } catch (error) {
    console.error('Error restricting PRO:', error);
    res.status(500).json({ status: 'error', message: 'Failed to restrict PRO' });
  }
});

/**
 * PATCH /admin/admins/:id/restrict
 * Restreindre les droits d'un ADMIN (SUPER_ADMIN only)
 */
router.patch('/admins/:id/restrict', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminType, isRestricted } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== ROLES.ADMIN) {
      return res.status(404).json({ status: 'error', message: 'ADMIN not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        adminType: adminType || user.adminType,
        isRestricted: typeof isRestricted === 'boolean' ? isRestricted : user.isRestricted,
      },
      select: { id: true, email: true, name: true, role: true, adminType: true, isRestricted: true },
    });
    console.log(`🔒 ADMIN restricted: ${updatedUser.email} by ${req.user.email}`);
    res.status(200).json({ status: 'success', data: { user: updatedUser } });
  } catch (error) {
    console.error('Error restricting ADMIN:', error);
    res.status(500).json({ status: 'error', message: 'Failed to restrict ADMIN' });
  }
});

// ============================================
// ADMIN ROUTES - PRO Management
// ============================================

/**
 * GET /admin/pro/pending
 * Get all PRO accounts with PENDING status
 * Access: ADMIN, SUPER_ADMIN
 */
router.get('/pro/pending', authenticate, requireAdmin, async (req, res) => {
  try {
    const pendingPros = await prisma.user.findMany({
      where: {
        role: ROLES.PRO,
        status: STATUS.PENDING,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        picture: true,
        status: true,
        createdAt: true,
        salon: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            phone: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: { pros: pendingPros, count: pendingPros.length },
    });
  } catch (error) {
    console.error('Error fetching pending PROs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch pending PRO accounts',
    });
  }
});

/**
 * GET /admin/pro/all
 * Get all PRO accounts with any status
 * Access: ADMIN, SUPER_ADMIN
 */
router.get('/pro/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    
    const where = { role: ROLES.PRO };
    if (status && Object.values(STATUS).includes(status)) {
      where.status = status;
    }

    const pros = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        picture: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        salon: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            phone: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: { pros, count: pros.length },
    });
  } catch (error) {
    console.error('Error fetching PROs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch PRO accounts',
    });
  }
});

/**
 * GET /admin/feedback
 * Get all feedbacks (bug/suggestion/problème)
 * Access: ADMIN, SUPER_ADMIN
 */
router.get('/feedback', authenticate, requireAdmin, async (req, res) => {
  try {
    const { type, status, limit } = req.query;
    const where = {};
    if (type) where.type = String(type).toLowerCase();
    if (status) where.status = String(status).toUpperCase();

    const take = Math.min(parseInt(limit || '100', 10) || 100, 300);

    const feedbacksRaw = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const feedbacks = feedbacksRaw.map((fb) => {
      let parsedPayload = {};
      try {
        parsedPayload = fb.payload ? JSON.parse(fb.payload) : {};
      } catch {
        parsedPayload = {};
      }
      return { ...fb, payload: parsedPayload };
    });

    res.status(200).json({
      status: 'success',
      data: { feedbacks, count: feedbacks.length },
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch feedback',
    });
  }
});

/**
 * GET /admin/disputes
 * List payment disputes for direct mobile payments (manual review mode)
 * Query: scope=open|resolved|all (default: open)
 * Access: ADMIN, SUPER_ADMIN
 */
router.get('/disputes', authenticate, requireAdmin, async (req, res) => {
  try {
    const scope = String(req.query?.scope || 'open').toLowerCase();
    const take = Math.min(parseInt(req.query?.limit || '100', 10) || 100, 300);

    const orders = await prisma.order.findMany({
      where: { payment: { isNot: null } },
      include: {
        salon: { select: { id: true, name: true, ownerId: true } },
        client: { select: { id: true, name: true, email: true, phoneNumber: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
        payment: true,
      },
      orderBy: { updatedAt: 'desc' },
      take,
    });

    const directMobileOrders = orders.filter((order) => {
      const methodKey = String(
        order.payment?.manualMethod || order.payment?.method || order.paymentMethod || ''
      ).toUpperCase();
      return DIRECT_MOBILE_METHODS.has(methodKey);
    });

    const openDisputes = directMobileOrders.filter((order) => {
      const orderStatus = String(order.status || '').toUpperCase();
      const proofStatus = String(order.payment?.proofStatus || '').toUpperCase();
      return orderStatus === 'DISPUTED' || (proofStatus === 'REJECTED' && ['PENDING_PAYMENT', 'DISPUTED'].includes(orderStatus));
    });

    const resolvedDisputes = directMobileOrders.filter((order) => {
      const orderStatus = String(order.status || '').toUpperCase();
      const proofStatus = String(order.payment?.proofStatus || '').toUpperCase();
      return ['CONFIRMED', 'CANCELLED', 'DELIVERED'].includes(orderStatus) && ['APPROVED', 'REJECTED'].includes(proofStatus);
    });

    const disputes =
      scope === 'resolved'
        ? resolvedDisputes
        : scope === 'all'
          ? directMobileOrders
          : openDisputes;

    res.status(200).json({
      status: 'success',
      data: {
        disputes,
        count: disputes.length,
        counts: {
          open: openDisputes.length,
          resolved: resolvedDisputes.length,
          total: directMobileOrders.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({
      status: 'error',
      message: 'Impossible de recuperer les litiges.',
    });
  }
});

/**
 * PATCH /admin/disputes/:id/resolve
 * Admin final decision for a disputed direct payment
 * Body: { decision: APPROVE|REJECT, reason?: string }
 * Access: ADMIN, SUPER_ADMIN
 */
router.patch('/disputes/:id/resolve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const decision = String(cleanString(req.body?.decision || req.body?.action || req.body?.status, 20) || '').toUpperCase();
    const reason = cleanString(req.body?.reason || req.body?.rejectionReason, 260);

    if (!['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({
        status: 'error',
        message: 'Decision invalide. Utilisez APPROVE ou REJECT.',
      });
    }
    if (decision === 'REJECT' && !reason) {
      return res.status(400).json({
        status: 'error',
        message: 'Le motif de rejet est obligatoire.',
      });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
        salon: { select: { id: true, name: true, ownerId: true } },
        client: { select: { id: true, name: true, email: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Commande introuvable.' });
    }
    if (!order.payment) {
      return res.status(400).json({ status: 'error', message: 'Aucune donnee paiement pour cette commande.' });
    }

    const paymentMethodKey = String(
      order.payment?.manualMethod || order.payment?.method || order.paymentMethod || ''
    ).toUpperCase();
    if (!DIRECT_MOBILE_METHODS.has(paymentMethodKey)) {
      return res.status(400).json({
        status: 'error',
        message: 'Cette commande n utilise pas un paiement direct mobile.',
      });
    }

    const now = new Date();
    const currentOrderStatus = String(order.status || '').toUpperCase();
    const approve = decision === 'APPROVE';
    let updatedOrder = null;
    let updatedPayment = null;

    await prisma.$transaction(async (tx) => {
      updatedPayment = await tx.payment.update({
        where: { id: order.payment.id },
        data: approve
          ? {
              status: 'COMPLETED',
              proofStatus: 'APPROVED',
              proofReviewedAt: now,
              proofReviewedBy: req.user.id,
              proofRejectionReason: null,
              completedAt: now,
            }
          : {
              status: 'FAILED',
              proofStatus: 'REJECTED',
              proofReviewedAt: now,
              proofReviewedBy: req.user.id,
              proofRejectionReason: reason,
              completedAt: null,
            },
      });

      if (approve) {
        const nextStatus = ['PENDING', 'PENDING_PAYMENT', 'DISPUTED'].includes(currentOrderStatus)
          ? 'CONFIRMED'
          : order.status;
        updatedOrder = await tx.order.update({
          where: { id },
          data: { status: nextStatus },
        });
        return;
      }

      const shouldCancelOrder = !['CANCELLED', 'DELIVERED'].includes(currentOrderStatus);
      if (shouldCancelOrder) {
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: id },
          select: { productId: true, quantity: true },
        });
        for (const item of orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      updatedOrder = await tx.order.update({
        where: { id },
        data: { status: shouldCancelOrder ? 'CANCELLED' : order.status },
      });
    });

    if (order.clientId) {
      try {
        const clientNotif = await prisma.notification.create({
          data: {
            userId: order.clientId,
            type: 'order',
            message: approve
              ? `Litige resolu: paiement valide pour votre commande chez ${order.salon?.name || 'la boutique'}.`
              : `Litige resolu: commande annulee (${reason}).`,
          },
        });
        pushNotification(clientNotif.userId, clientNotif);
      } catch (e) {
        console.error('Dispute notify client error:', e.message);
      }
    }

    if (order.salon?.ownerId) {
      try {
        const ownerNotif = await prisma.notification.create({
          data: {
            userId: order.salon.ownerId,
            type: 'order',
            message: approve
              ? `Litige resolu par admin: paiement confirme pour la commande ${id.slice(-8).toUpperCase()}.`
              : `Litige resolu par admin: commande ${id.slice(-8).toUpperCase()} annulee.`,
          },
        });
        pushNotification(ownerNotif.userId, ownerNotif);
      } catch (e) {
        console.error('Dispute notify owner error:', e.message);
      }
    }

    return res.status(200).json({
      status: 'success',
      message: approve ? 'Litige valide: paiement confirme.' : 'Litige rejete: commande annulee.',
      data: {
        order: updatedOrder,
        payment: updatedPayment,
      },
    });
  } catch (error) {
    console.error('Error resolving dispute:', error);
    res.status(500).json({
      status: 'error',
      message: 'Impossible de resoudre le litige.',
    });
  }
});

/**
 * PATCH /admin/pro/:id/approve
 * Approve a PRO account
 * Access: ADMIN, SUPER_ADMIN
 */
router.patch('/pro/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true },
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (user.role !== ROLES.PRO) {
      return res.status(400).json({
        status: 'error',
        message: 'User is not a PRO account',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: STATUS.APPROVED },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    console.log(`✅ PRO account approved: ${updatedUser.email} by ${req.user.email}`);

    // Notifier le PRO par email (non-bloquant)
    sendProApprovedEmail({ to: updatedUser.email, name: updatedUser.name });

    res.status(200).json({
      status: 'success',
      message: 'PRO account approved successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Error approving PRO:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to approve PRO account',
    });
  }
});

/**
 * PATCH /admin/pro/:id/reject
 * Reject a PRO account
 * Access: ADMIN, SUPER_ADMIN
 */
router.patch('/pro/:id/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true },
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (user.role !== ROLES.PRO) {
      return res.status(400).json({
        status: 'error',
        message: 'User is not a PRO account',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: STATUS.REJECTED },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    console.log(`❌ PRO account rejected: ${updatedUser.email} by ${req.user.email}. Reason: ${reason || 'N/A'}`);

    res.status(200).json({
      status: 'success',
      message: 'PRO account rejected',
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Error rejecting PRO:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reject PRO account',
    });
  }
});

/**
 * PATCH /admin/pro/:id/suspend
 * Suspend a PRO account
 * Access: ADMIN, SUPER_ADMIN
 */
router.patch('/pro/:id/suspend', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true },
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (user.role !== ROLES.PRO) {
      return res.status(400).json({
        status: 'error',
        message: 'User is not a PRO account',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: STATUS.SUSPENDED },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    console.log(`⏸️ PRO account suspended: ${updatedUser.email} by ${req.user.email}. Reason: ${reason || 'N/A'}`);

    res.status(200).json({
      status: 'success',
      message: 'PRO account suspended',
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Error suspending PRO:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to suspend PRO account',
    });
  }
});

/**
 * PATCH /admin/pro/:id/reactivate
 * Reactivate a suspended/rejected PRO account
 * Access: ADMIN, SUPER_ADMIN
 */
router.patch('/pro/:id/reactivate', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true },
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (user.role !== ROLES.PRO) {
      return res.status(400).json({
        status: 'error',
        message: 'User is not a PRO account',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: STATUS.APPROVED },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    console.log(`🔄 PRO account reactivated: ${updatedUser.email} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'PRO account reactivated',
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Error reactivating PRO:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reactivate PRO account',
    });
  }
});

/**
 * DELETE /admin/pro/:id
 * Delete a PRO account and its salon
 * Access: ADMIN, SUPER_ADMIN
 */
router.delete('/pro/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    if (user.role !== ROLES.PRO) {
      return res.status(400).json({ status: 'error', message: 'User is not a PRO account' });
    }

    await prisma.$transaction(async (tx) => {
      const salon = await tx.salon.findFirst({ where: { ownerId: id }, select: { id: true } });
      if (salon) {
        const salonId = salon.id;
        await deleteAppointmentsAndPayments(tx, { salonId });
        await deleteOrdersAndPayments(tx, { salonId });
        await tx.review.deleteMany({ where: { salonId } });
        await tx.openingHour.deleteMany({ where: { salonId } });
        await tx.galleryImage.deleteMany({ where: { salonId } });
        await tx.salonPaymentMethod.deleteMany({ where: { salonId } });
        await tx.salonSettings.deleteMany({ where: { salonId } });
        await tx.planningBreak.deleteMany({ where: { salonId } });
        await tx.planningException.deleteMany({ where: { salonId } });
        await tx.planningHoliday.deleteMany({ where: { salonId } });
        await tx.staffMember.deleteMany({ where: { salonId } });
        await tx.promoCode.deleteMany({ where: { salonId } });
        await tx.loyalty.deleteMany({ where: { salonId } });

        const serviceIds = await tx.service.findMany({
          where: { salonId },
          select: { id: true },
        });
        const serviceIdList = serviceIds.map((s) => s.id);
        if (serviceIdList.length) {
          await tx.serviceImage.deleteMany({ where: { serviceId: { in: serviceIdList } } });
        }
        await tx.service.deleteMany({ where: { salonId } });

        const productIds = await tx.product.findMany({
          where: { salonId },
          select: { id: true },
        });
        const productIdList = productIds.map((product) => product.id);
        if (productIdList.length) {
          await tx.productImage.deleteMany({ where: { productId: { in: productIdList } } });
        }
        await tx.product.deleteMany({ where: { salonId } });

        const coiffeurIds = await tx.coiffeur.findMany({
          where: { salonId },
          select: { id: true },
        });
        const coiffeurIdList = coiffeurIds.map((c) => c.id);
        if (coiffeurIdList.length) {
          await tx.availability.deleteMany({ where: { coiffeurId: { in: coiffeurIdList } } });
        }
        await tx.coiffeur.deleteMany({ where: { salonId } });

        await tx.salon.delete({ where: { id: salonId } });
      }

      await deleteAppointmentsAndPayments(tx, { clientId: id });
      await deleteOrdersAndPayments(tx, { clientId: id });
      await tx.payment.deleteMany({ where: { userId: id } });
      await tx.review.deleteMany({ where: { userId: id } });
      await tx.loyalty.deleteMany({ where: { clientId: id } });
      await tx.user.delete({ where: { id } });
    });

    console.log(`🗑️ PRO deleted: ${user.email} by ${req.user.email}`);
    res.status(200).json({
      status: 'success',
      message: 'PRO and salon deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting PRO:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete PRO account' });
  }
});

// ============================================
// ADMIN ROUTES - CLIENT Management
// ============================================

/**
 * GET /admin/clients
 * Get all CLIENT accounts
 * Access: ADMIN, SUPER_ADMIN
 */
router.get('/clients', authenticate, requireAdmin, async (req, res) => {
  try {
    const clients = await prisma.user.findMany({
      where: { role: ROLES.CLIENT },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        picture: true,
        createdAt: true,
        _count: {
          select: { appointments: true, reviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: { clients, count: clients.length },
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch client accounts',
    });
  }
});

/**
 * DELETE /admin/clients/:id
 * Delete a CLIENT account
 * Access: SUPER_ADMIN only
 */
router.delete('/clients/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Client id is required' });
    }

    if (req.user.id === id) {
      return res.status(400).json({ status: 'error', message: 'Cannot delete your own account' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Client not found' });
    }
    if (user.role !== ROLES.CLIENT) {
      return res.status(400).json({ status: 'error', message: 'User is not a client account' });
    }

    await prisma.$transaction(async (tx) => {
      const appointmentIds = await tx.appointment.findMany({
        where: { clientId: id },
        select: { id: true },
      });
      const apptIdList = appointmentIds.map((item) => item.id);

      if (apptIdList.length) {
        await tx.payment.deleteMany({ where: { appointmentId: { in: apptIdList } } });
      }

      await tx.appointment.deleteMany({ where: { clientId: id } });
      await tx.order.deleteMany({ where: { clientId: id } });
      await tx.payment.deleteMany({ where: { userId: id } });
      await tx.review.deleteMany({ where: { userId: id } });
      await tx.loyalty.deleteMany({ where: { clientId: id } });
      await tx.user.delete({ where: { id } });
    });

    console.log(`🗑️ CLIENT deleted: ${user.email} by ${req.user.email}`);
    res.status(200).json({
      status: 'success',
      message: 'Client deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete client account' });
  }
});

// ============================================
// ADMIN ROUTES - Stats
// ============================================

/**
 * GET /admin/stats
 * Get platform statistics
 * Access: ADMIN, SUPER_ADMIN
 */
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [
      totalClients,
      totalPros,
      pendingPros,
      approvedPros,
      totalAppointments,
      totalSalons,
      siteVisits,
    ] = await Promise.all([
      prisma.user.count({ where: { role: ROLES.CLIENT } }),
      prisma.user.count({ where: { role: ROLES.PRO } }),
      prisma.user.count({ where: { role: ROLES.PRO, status: STATUS.PENDING } }),
      prisma.user.count({ where: { role: ROLES.PRO, status: STATUS.APPROVED } }),
      prisma.appointment.count(),
      prisma.salon.count(),
      getSiteVisitSummary(),
    ]);

    console.log('[STATS] totalClients:', totalClients, 'totalPros:', totalPros, 'pendingPros:', pendingPros, 'approvedPros:', approvedPros, 'totalAppointments:', totalAppointments, 'totalSalons:', totalSalons, 'siteVisits:', siteVisits.total);
    res.status(200).json({
      status: 'success',
      data: {
        clients: totalClients,
        pros: {
          total: totalPros,
          pending: pendingPros,
          approved: approvedPros,
        },
        appointments: totalAppointments,
        salons: totalSalons,
        siteVisits,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch stats',
    });
  }
});

// ============================================
// SUPER_ADMIN ROUTES - Admin Management
// ============================================

/**
 * GET /admin/admins
 * Get all ADMIN accounts
 * Access: SUPER_ADMIN only
 */
router.get('/admins', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: ROLES.ADMIN },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: { admins, count: admins.length },
    });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch admins',
    });
  }
});

/**
 * POST /admin/admins
 * Promote a user to ADMIN by email
 * Access: SUPER_ADMIN only
 */
router.post('/admins', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'L\'email est requis',
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Aucun utilisateur trouvé avec cet email',
      });
    }

    if (user.role === ROLES.SUPER_ADMIN) {
      return res.status(400).json({
        status: 'error',
        message: 'Impossible de modifier un SUPER_ADMIN',
      });
    }

    if (user.role === ROLES.ADMIN) {
      return res.status(400).json({
        status: 'error',
        message: 'Cet utilisateur est déjà administrateur',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: ROLES.ADMIN, status: STATUS.APPROVED },
      select: { id: true, email: true, name: true, role: true },
    });

    console.log(`👑 User promoted to ADMIN by email: ${updatedUser.email} by ${req.user.email}`);

    // Send notification email to the new admin
    sendAdminPromotionEmail({ to: updatedUser.email, name: updatedUser.name }).catch(() => {});

    res.status(200).json({
      status: 'success',
      message: 'Utilisateur promu administrateur',
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Error promoting admin by email:', error);
    res.status(500).json({ status: 'error', message: 'Erreur lors de la promotion' });
  }
});

/**
 * POST /admin/admins/create
 * Promote a user to ADMIN (by userId)
 * Access: SUPER_ADMIN only
 */
router.post('/admins/create', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'userId is required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (user.role === ROLES.SUPER_ADMIN) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot modify SUPER_ADMIN',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: ROLES.ADMIN, status: STATUS.APPROVED },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    console.log(`👑 User promoted to ADMIN: ${updatedUser.email} by ${req.user.email}`);

    // Send notification email to the new admin
    sendAdminPromotionEmail({ to: updatedUser.email, name: updatedUser.name }).catch(() => {});

    res.status(200).json({
      status: 'success',
      message: 'User promoted to ADMIN',
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create admin',
    });
  }
});

/**
 * DELETE /admin/admins/:id
 * Demote an ADMIN back to CLIENT
 * Access: SUPER_ADMIN only
 */
router.delete('/admins/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (user.role !== ROLES.ADMIN) {
      return res.status(400).json({
        status: 'error',
        message: 'User is not an ADMIN',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: ROLES.CLIENT },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    console.log(`📉 ADMIN demoted to CLIENT: ${updatedUser.email} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'ADMIN demoted to CLIENT',
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove admin',
    });
  }
});

module.exports = router;
