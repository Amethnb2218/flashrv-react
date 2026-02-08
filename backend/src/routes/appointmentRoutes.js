const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const prisma = new PrismaClient();

/**
 * Get all appointments for current user
 * GET /api/appointments
 * Query: status, from, to
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, from, to } = req.query;
    const userId = req.user.id;

    // Build where clause based on user role
    let where = {};

    if (req.user.role === 'CLIENT') {
      where.clientId = userId;
    } else if (req.user.role === 'COIFFEUR') {
      const coiffeur = await prisma.coiffeur.findUnique({
        where: { userId },
      });
      if (coiffeur) {
        where.coiffeurId = coiffeur.id;
      }
    } else if (req.user.role === 'SALON_OWNER') {
      const salon = await prisma.salon.findUnique({
        where: { ownerId: userId },
      });
      if (salon) {
        where.salonId = salon.id;
      }
    }

    // Add filters
    if (status) {
          where.status = status;
    }

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, email: true, picture: true, phoneNumber: true },
        },
        salon: {
          select: { id: true, name: true, address: true, city: true, phone: true },
        },
        coiffeur: {
          include: {
            user: {
              select: { name: true, picture: true },
            },
          },
        },
        service: {
          select: { id: true, name: true, price: true, duration: true },
        },
        payment: true,
      },
      orderBy: { date: 'desc' },
    });

    res.status(200).json({ data: appointments });
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new appointment
 * POST /api/appointments
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { salonId, coiffeurId, serviceId, date, startTime, notes } = req.body;

    // Validate required fields (coiffeurId is now optional - assigned by salon owner later)
    if (!salonId || !serviceId || !date || !startTime) {
      return res.status(400).json({
        status: 'error',
        message: 'Salon, service, date, and start time are required',
      });
    }

    // Get service to calculate end time and price
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found',
      });
    }

    // Calculate end time
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + service.duration;
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

    const appointmentDate = new Date(date);

    // Check for conflicting appointments only if coiffeurId is provided
    if (coiffeurId) {
      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          coiffeurId,
          date: appointmentDate,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gte: endTime } },
              ],
            },
          ],
        },
      });

      if (conflictingAppointment) {
        return res.status(400).json({
          status: 'error',
          message: 'This time slot is not available. Please choose another time.',
        });
      }
    }

    // Create appointment (status PENDING_ASSIGNMENT if no coiffeur assigned)
    const appointment = await prisma.appointment.create({
      data: {
        date: appointmentDate,
        startTime,
        endTime,
        totalPrice: service.price,
        notes,
        status: coiffeurId ? 'PENDING' : 'PENDING_ASSIGNMENT',
        clientId: req.user.id,
        salonId,
        coiffeurId: coiffeurId || null,
        serviceId,
      },
      include: {
        salon: {
          select: { name: true, address: true },
        },
        coiffeur: coiffeurId ? {
          include: {
            user: { select: { name: true } },
          },
        } : false,
        service: true,
      },
    });

    res.status(201).json({
      status: 'success',
      message: coiffeurId 
        ? 'Appointment booked successfully' 
        : 'Réservation créée. Le salon vous assignera un(e) coiffeur(se).',
      data: { appointment },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get single appointment
 * GET /api/appointments/:id
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, email: true, picture: true, phoneNumber: true },
        },
        salon: true,
        coiffeur: {
          include: {
            user: { select: { name: true, picture: true } },
          },
        },
        service: true,
        payment: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({
        status: 'error',
        message: 'Appointment not found',
      });
    }

    // Check access
    const hasAccess =
      appointment.clientId === req.user.id ||
      req.user.role === 'ADMIN' ||
      (req.user.role === 'SALON_OWNER' && appointment.salon.ownerId === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to this appointment',
      });
    }

    res.status(200).json({
      status: 'success',
      data: { appointment },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update appointment status
 * PATCH /api/appointments/:id/status
 */
router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { salon: true },
    });

    if (!appointment) {
      return res.status(404).json({
        status: 'error',
        message: 'Appointment not found',
      });
    }

    // Check permissions
    const canUpdate =
      req.user.role === 'ADMIN' ||
      (req.user.role === 'SALON_OWNER' && appointment.salon.ownerId === req.user.id) ||
      (status === 'CANCELLED' && appointment.clientId === req.user.id);

    if (!canUpdate) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this appointment',
      });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        client: { select: { name: true, email: true } },
        service: { select: { name: true } },
      },
    });

    res.status(200).json({
      status: 'success',
      message: `Appointment ${status.toLowerCase()}`,
      data: { appointment: updatedAppointment },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Assign a coiffeur to an appointment (Salon Owner only)
 * PATCH /api/appointments/:id/assign-coiffeur
 */
router.patch('/:id/assign-coiffeur', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { coiffeurId } = req.body;

    if (!coiffeurId) {
      return res.status(400).json({
        status: 'error',
        message: 'coiffeurId is required',
      });
    }

    // Get appointment with salon info
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { 
        salon: true,
        client: { select: { id: true, name: true, email: true } },
        service: { select: { name: true, duration: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({
        status: 'error',
        message: 'Appointment not found',
      });
    }

    // Only salon owner or admin can assign coiffeur
    if (req.user.role !== 'ADMIN' && 
        !(req.user.role === 'SALON_OWNER' && appointment.salon.ownerId === req.user.id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only salon owner can assign a coiffeur',
      });
    }

    // Verify coiffeur belongs to this salon
    const coiffeur = await prisma.coiffeur.findFirst({
      where: { 
        id: coiffeurId,
        salonId: appointment.salonId,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    if (!coiffeur) {
      return res.status(400).json({
        status: 'error',
        message: 'Coiffeur not found or does not belong to this salon',
      });
    }

    // Check for conflicting appointments
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        id: { not: id },
        coiffeurId,
        date: appointment.date,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        OR: [
          {
            AND: [
              { startTime: { lte: appointment.startTime } },
              { endTime: { gt: appointment.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: appointment.endTime } },
              { endTime: { gte: appointment.endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingAppointment) {
      return res.status(400).json({
        status: 'error',
        message: 'Ce(tte) coiffeur(se) n\'est pas disponible à ce créneau.',
      });
    }

    // Update appointment with coiffeur and confirm
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { 
        coiffeurId,
        status: 'CONFIRMED',
      },
      include: {
        client: { select: { name: true, email: true } },
        coiffeur: {
          include: {
            user: { select: { name: true } },
          },
        },
        service: { select: { name: true } },
        salon: { select: { name: true, address: true, phone: true } },
      },
    });

    // TODO: Send notification to client (email/SMS)
    // For now, just log the notification
    console.log(`📧 Notification: Client ${appointment.client.name} assigned to ${coiffeur.user.name}`);
    console.log(`   Date: ${appointment.date.toISOString().split('T')[0]} at ${appointment.startTime}`);
    console.log(`   Service: ${appointment.service.name}`);

    res.status(200).json({
      status: 'success',
      message: `Coiffeur(se) ${coiffeur.user.name} assigné(e). Le client sera notifié.`,
      data: { 
        appointment: updatedAppointment,
        notification: {
          clientName: appointment.client.name,
          clientEmail: appointment.client.email,
          coiffeurName: coiffeur.user.name,
          date: appointment.date,
          time: appointment.startTime,
          service: appointment.service.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Cancel appointment (client)
 * DELETE /api/appointments/:id
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return res.status(404).json({
        status: 'error',
        message: 'Appointment not found',
      });
    }

    // Only client or admin can cancel
    if (appointment.clientId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'You can only cancel your own appointments',
      });
    }

    // Check if appointment can be cancelled (e.g., not too close to start time)
    const appointmentDateTime = new Date(appointment.date);
    const [hours, minutes] = appointment.startTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const hoursUntilAppointment = (appointmentDateTime - new Date()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 2 && req.user.role !== 'ADMIN') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot cancel appointment less than 2 hours before start time',
      });
    }

    await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.status(200).json({
      status: 'success',
      message: 'Appointment cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get available time slots for a coiffeur on a specific date
 * GET /api/appointments/availability/:coiffeurId
 * Query: date
 */
router.get('/availability/:coiffeurId', async (req, res, next) => {
  try {
    const { coiffeurId } = req.params;
    const { date, serviceId } = req.query;

    if (!date) {
      return res.status(400).json({
        status: 'error',
        message: 'Date is required',
      });
    }

    const coiffeur = await prisma.coiffeur.findUnique({
      where: { id: coiffeurId },
      include: {
        salon: {
          include: { openingHours: true },
        },
      },
    });

    if (!coiffeur) {
      return res.status(404).json({
        status: 'error',
        message: 'Coiffeur not found',
      });
    }

    // Get service duration
    let duration = 30; // default
    if (serviceId) {
      const service = await prisma.service.findUnique({ where: { id: serviceId } });
      if (service) duration = service.duration;
    }

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();

    // Get salon opening hours for this day
    const openingHour = coiffeur.salon.openingHours.find(h => h.dayOfWeek === dayOfWeek);

    if (!openingHour || openingHour.isClosed) {
      return res.status(200).json({
        status: 'success',
        message: 'Salon is closed on this day',
        data: { slots: [] },
      });
    }

    // Get existing appointments for this coiffeur on this date
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        coiffeurId,
        date: appointmentDate,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { startTime: true, endTime: true },
    });

    // Generate available slots
    const slots = [];
    const [openHour, openMin] = openingHour.openTime.split(':').map(Number);
    const [closeHour, closeMin] = openingHour.closeTime.split(':').map(Number);

    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;

    for (let time = openMinutes; time + duration <= closeMinutes; time += 30) {
      const slotStart = `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}`;
      const slotEnd = `${Math.floor((time + duration) / 60).toString().padStart(2, '0')}:${((time + duration) % 60).toString().padStart(2, '0')}`;

      // Check if slot conflicts with existing appointments
      const isAvailable = !existingAppointments.some(apt => {
        const aptStart = apt.startTime;
        const aptEnd = apt.endTime;
        return (slotStart < aptEnd && slotEnd > aptStart);
      });

      if (isAvailable) {
        slots.push({ startTime: slotStart, endTime: slotEnd });
      }
    }

    res.status(200).json({
      status: 'success',
      data: { slots },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
