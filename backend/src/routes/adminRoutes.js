
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin, requireSuperAdmin, ROLES, STATUS } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

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
    if (user.role !== ROLES.PRO && user.role !== ROLES.SALON_OWNER) {
      return res.status(400).json({ status: 'error', message: 'User is not a PRO account' });
    }

    await prisma.$transaction(async (tx) => {
      const salon = await tx.salon.findFirst({ where: { ownerId: id }, select: { id: true } });
      if (salon) {
        const salonId = salon.id;
        const apptIds = await tx.appointment.findMany({
          where: { salonId },
          select: { id: true },
        });
        const appointmentIds = apptIds.map((a) => a.id);
        if (appointmentIds.length) {
          await tx.payment.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
        }
        await tx.appointment.deleteMany({ where: { salonId } });
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
// ADMIN ROUTES - CLIENT Management (Read-only)
// ============================================

/**
 * GET /admin/clients
 * Get all CLIENT accounts (read-only)
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
    ] = await Promise.all([
      prisma.user.count({ where: { role: ROLES.CLIENT } }),
      prisma.user.count({ where: { role: ROLES.PRO } }),
      prisma.user.count({ where: { role: ROLES.PRO, status: STATUS.PENDING } }),
      prisma.user.count({ where: { role: ROLES.PRO, status: STATUS.APPROVED } }),
      prisma.appointment.count(),
      prisma.salon.count(),
    ]);

    console.log('[STATS] totalClients:', totalClients, 'totalPros:', totalPros, 'pendingPros:', pendingPros, 'approvedPros:', approvedPros, 'totalAppointments:', totalAppointments, 'totalSalons:', totalSalons);
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
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    console.log('[PRO PENDING] count:', pendingPros.length);
    res.status(200).json({
      status: 'success',
      data: { pros: pendingPros, count: pendingPros.length },
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
    console.log('[PRO ALL] count:', pros.length);
    res.status(200).json({
      status: 'success',
      data: { pros, count: pros.length },
    });
  }
});

/**
 * POST /admin/admins/create
 * Promote a user to ADMIN
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

    res.status(200).json({
      status: 'success',
      message: 'User promoted to ADMIN',
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    console.log('[CLIENTS] count:', clients.length);
    res.status(200).json({
      status: 'success',
      data: { clients, count: clients.length },
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
    console.log('[ADMINS] count:', admins.length);
    res.status(200).json({
      status: 'success',
      data: { admins, count: admins.length },
    });
  }
});

module.exports = router;
