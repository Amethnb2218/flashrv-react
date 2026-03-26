const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { pushNotification, pushChatMessage } = require('../realtime/hub');
const { sendBookingConfirmationEmail } = require('../services/emailService');
const { sendPushToUser } = require('../services/pushService');
const { createBookingNotification } = require('../services/bookingNotificationService');
const { uploadVoice, uploadPaymentProof } = require('../config/cloudinary');

const DIRECT_MOBILE_METHODS = new Set(['ORANGE_MONEY', 'WAVE', 'FREE_MONEY']);
const ORANGE_MONEY_REFERENCE_REGEX = /^MP\d{6}\.\d{4}\.C\d{5}$/i;

const cleanString = (value, max = 220) => {
  if (value == null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.slice(0, max);
};

const normalizeAppointmentPaymentMethod = (value) => cleanString(value, 40)?.toUpperCase() || null;

const buildPaymentReference = (prefix = 'APTPAY') =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const toFriendlyPaymentMethodLabel = (method) => {
  const key = String(method || '').toUpperCase();
  if (key === 'DEXPAY' || key === 'PAYTECH' || key === 'PAYDUNYA') return 'DexPay';
  if (key === 'ORANGE_MONEY') return 'Orange Money';
  if (key === 'WAVE') return 'Wave';
  if (key === 'FREE_MONEY') return 'Free Money';
  if (key === 'PAY_ON_SITE') return 'Paiement au salon';
  return key || 'Paiement';
};

const canAccessAppointment = (appointment, user) => {
  if (!appointment || !user) return false;
  if (appointment.clientId === user.id) return true;
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
  if ((user.role === 'PRO' || user.role === 'SALON_OWNER') && appointment.salon?.ownerId === user.id) return true;
  return false;
};

/**
 * Get all appointments for current user
 * GET /api/appointments
 * Query: status, from, to
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, from, to, scope, asClient } = req.query;
    const userId = req.user.id;

    // Build where clause based on user role
    let where = {};

    const normalizedScope = String(scope || '').toLowerCase();
    const forceClientScope =
      normalizedScope === 'client' ||
      normalizedScope === 'mes-reservations' ||
      String(asClient || '').toLowerCase() === 'true';

    if (forceClientScope) {
      where.clientId = userId;
    } else if (req.user.role === 'CLIENT') {
      where.clientId = userId;
    } else if (req.user.role === 'COIFFEUR') {
      const coiffeur = await prisma.coiffeur.findUnique({
        where: { userId },
      });
      if (coiffeur) {
        where.coiffeurId = coiffeur.id;
      }
    } else if (req.user.role === 'PRO' || req.user.role === 'SALON_OWNER') {
      const salon = await prisma.salon.findUnique({
        where: { ownerId: userId },
      });
      if (salon) {
        where.salonId = salon.id;
      }
    } else {
      // Fallback: treat unknown roles as client
      where.clientId = userId;
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
          select: { id: true, name: true, email: true, picture: true, phoneNumber: true, address: true },
        },
        salon: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            phone: true,
            image: true,
            gallery: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: { id: true, url: true },
            },
          },
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
    const {
      salonId,
      coiffeurId,
      serviceId,
      serviceIds,
      date,
      startTime,
      notes,
      clientFirstName,
      clientLastName,
      clientPhone,
      clientAddress,
      status,
      paymentMethod,
      requiresOnlinePayment,
      skipConfirmationEmail,
      skipNotifications,
      sendConfirmation,
    } = req.body;

    // Validate required fields (coiffeurId is now optional - assigned by salon owner later)
    const normalizedServiceIds = Array.isArray(serviceIds) && serviceIds.length > 0
      ? serviceIds
      : (serviceId ? [serviceId] : []);

    if (!salonId || normalizedServiceIds.length === 0 || !date || !startTime) {
      return res.status(400).json({
        status: 'error',
        message: 'Salon, service, date, and start time are required',
      });
    }

    const firstName = String(clientFirstName || '').trim();
    const lastName = String(clientLastName || '').trim();
    const phone = String(clientPhone || '').trim();
    const address = clientAddress == null ? '' : String(clientAddress).trim();
    if (!firstName || !lastName || !phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Client first name, last name, and phone are required',
      });
    }

    const fullName = `${firstName} ${lastName}`.trim();
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: fullName,
        phoneNumber: phone,
        ...(clientAddress !== undefined ? { address: address || null } : {}),
      },
    });

    const primaryServiceId = serviceId || normalizedServiceIds[0];
    if (!normalizedServiceIds.includes(primaryServiceId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid service selection',
      });
    }

    // Get services to calculate end time and price (support multiple services)
    const services = await prisma.service.findMany({
      where: { id: { in: normalizedServiceIds } },
    });

    if (services.length !== normalizedServiceIds.length) {
      return res.status(404).json({
        status: 'error',
        message: 'One or more services not found',
      });
    }

    const primaryService = services.find(s => s.id === primaryServiceId) || services[0];
    const totalDuration = services.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalPrice = services.reduce((sum, s) => sum + (s.price || 0), 0);

    // Calculate end time
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + totalDuration;
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ status: 'error', message: 'Date invalide' });
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (appointmentDate < now) {
      return res.status(400).json({ status: 'error', message: 'Impossible de réserver dans le passé' });
    }

    const extraServices = services.filter(s => s.id !== primaryServiceId);
    const extraServicesNote = extraServices.length > 0
      ? `Services additionnels: ${extraServices.map(s => `${s.name} (${s.price} FCFA)`).join(', ')}`
      : '';
    const combinedNotes = [notes && notes.trim(), extraServicesNote].filter(Boolean).join('\n');
    const requestedStatus = String(status || '').trim().toUpperCase();
    const rawPaymentMethod = String(paymentMethod || '').trim().toUpperCase();
    const normalizedPaymentMethod = ['PAYDUNYA', 'PAYTECH'].includes(rawPaymentMethod)
      ? 'DEXPAY'
      : rawPaymentMethod;
    const isDexPayFlow =
      Boolean(requiresOnlinePayment) ||
      normalizedPaymentMethod === 'DEXPAY' ||
      requestedStatus === 'PENDING_PAYMENT';
    const shouldSkipNotifications = skipNotifications === true;
    const shouldSendConfirmationEmail =
      sendConfirmation !== false &&
      skipConfirmationEmail !== true &&
      !isDexPayFlow;
    const appointmentInitialStatus = isDexPayFlow
      ? 'PENDING_PAYMENT'
      : (requestedStatus || 'PENDING');

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

    // Create appointment with pending payment status
    const appointment = await prisma.appointment.create({
      data: {
        date: appointmentDate,
        startTime,
        endTime,
        totalPrice: totalPrice,
        notes: combinedNotes || null,
        status: appointmentInitialStatus,
        clientId: req.user.id,
        salonId,
        coiffeurId: coiffeurId || null,
        serviceId: primaryServiceId,
      },
      include: {
        salon: {
          select: { id: true, name: true, address: true, ownerId: true },
        },
        client: {
          select: { id: true, name: true, email: true, phoneNumber: true, address: true },
        },
        coiffeur: coiffeurId ? {
          include: {
            user: { select: { name: true } },
          },
        } : false,
        service: true,
      },
    });

    if (!shouldSkipNotifications && appointment?.salon?.ownerId && appointment.salon.ownerId !== req.user.id) {
      try {
        const notification = await prisma.notification.create({
          data: {
            userId: appointment.salon.ownerId,
            type: 'booking',
            message: `Nouvelle réservation de ${fullName} le ${new Date(appointmentDate).toLocaleDateString('fr-FR')} à ${startTime}.`,
          },
        });
        pushNotification(notification.userId, notification);
      } catch (e) {
        console.error('Notification booking error:', e.message);
      }
    }

    const shouldCreateClientBookingNotification =
      !shouldSkipNotifications &&
      appointment?.clientId &&
      normalizedPaymentMethod !== 'PAY_ON_SITE';

    // Store client confirmation notification for in-app bell
    if (shouldCreateClientBookingNotification) {
      try {
        const notification = await createBookingNotification({
          userId: appointment.clientId,
          salonName: appointment.salon?.name || 'le salon',
          date: appointmentDate,
          startTime,
          message: isDexPayFlow
            ? `Reservation creee chez ${appointment.salon?.name || 'le salon'} le ${new Date(appointmentDate).toLocaleDateString('fr-FR')} a ${startTime}. Paiement en attente.`
            : `Reservation enregistree chez ${appointment.salon?.name || 'le salon'} le ${new Date(appointmentDate).toLocaleDateString('fr-FR')} a ${startTime}.`,
        });
        pushNotification(notification.userId, notification);
      } catch (e) {
        console.error('Notification booking client error:', e.message);
      }
    }

    // Send confirmation email to client
    if (shouldSendConfirmationEmail && appointment?.client?.email) {
      sendBookingConfirmationEmail({
        to: appointment.client.email,
        clientName: fullName,
        salonName: appointment.salon?.name || 'le salon',
        date: appointmentDate,
        time: startTime,
        services,
        totalPrice,
      }).catch(() => {});
    }

    // Push notification to client
    if (!shouldSkipNotifications) {
      sendPushToUser(req.user.id, {
        title: 'Reservation creee',
        body: isDexPayFlow
          ? `RDV chez ${appointment.salon?.name || 'le salon'} le ${new Date(appointmentDate).toLocaleDateString('fr-FR')} a ${startTime}. Paiement en attente.`
          : `RDV chez ${appointment.salon?.name || 'le salon'} le ${new Date(appointmentDate).toLocaleDateString('fr-FR')} a ${startTime}.`,
        url: '/dashboard',
      }).catch(() => {});
    }

    // Push notification to salon owner
    if (!shouldSkipNotifications && appointment?.salon?.ownerId && appointment.salon.ownerId !== req.user.id) {
      sendPushToUser(appointment.salon.ownerId, {
        title: '📅 Nouvelle réservation',
        body: `${fullName} a réservé le ${new Date(appointmentDate).toLocaleDateString('fr-FR')} à ${startTime}.`,
        url: '/pro/dashboard',
      }).catch(() => {});
    }

    res.status(201).json({
      status: 'success',
      message: coiffeurId
        ? 'Appointment booked successfully'
        : (isDexPayFlow
          ? 'Reservation creee. Paiement requis pour confirmer le rendez-vous.'
          : 'Reservation creee. Le salon vous assignera un(e) coiffeur(se).'),
      data: { appointment },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/appointments/:id/payment-proof
 * Client submits direct mobile payment proof for a salon booking
 */
router.post('/:id/payment-proof', authenticate, uploadPaymentProof.single('proof'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const normalizedMethod = normalizeAppointmentPaymentMethod(req.body?.paymentMethod);
    const payerPhone = cleanString(req.body?.payerPhone, 40);
    const proofReference = cleanString(req.body?.proofReference, 120);
    const proofNote = cleanString(req.body?.proofNote, 400);
    const proofAmount = Number(req.body?.proofAmount);

    if (!normalizedMethod || !DIRECT_MOBILE_METHODS.has(normalizedMethod)) {
      return res.status(400).json({
        status: 'error',
        message: 'Choisissez un moyen de paiement mobile valide (Orange Money, Wave, Free Money).',
      });
    }
    if (!proofReference) {
      return res.status(400).json({ status: 'error', message: 'La reference transaction est obligatoire.' });
    }
    if (normalizedMethod === 'ORANGE_MONEY') {
      const normalizedOmReference = String(proofReference).toUpperCase();
      if (!ORANGE_MONEY_REFERENCE_REGEX.test(normalizedOmReference)) {
        return res.status(400).json({
          status: 'error',
          message: 'Reference Orange Money invalide. Format attendu: MP260313.2207.C03995.',
        });
      }
    }
    if (!payerPhone) {
      return res.status(400).json({ status: 'error', message: 'Le numero de l envoyeur est obligatoire.' });
    }
    if (!Number.isFinite(proofAmount) || proofAmount <= 0) {
      return res.status(400).json({ status: 'error', message: 'Le montant envoye est invalide.' });
    }

    const appointment = await prisma.appointment.findUnique({
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

    if (!appointment) {
      return res.status(404).json({ status: 'error', message: 'Reservation introuvable' });
    }
    if (appointment.clientId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Acces interdit' });
    }

    const activeMethod = (appointment.salon?.paymentMethods || []).find(
      (item) => String(item.method || '').toUpperCase() === normalizedMethod
    );
    if (!activeMethod) {
      return res.status(400).json({
        status: 'error',
        message: `Ce salon n a pas active ${toFriendlyPaymentMethodLabel(normalizedMethod)}.`,
      });
    }

    if (
      String(appointment.payment?.status || '').toUpperCase() === 'COMPLETED' &&
      String(appointment.payment?.proofStatus || '').toUpperCase() === 'APPROVED'
    ) {
      return res.status(409).json({
        status: 'error',
        message: 'Le paiement est deja valide pour cette reservation.',
      });
    }

    const proofUrl = req.file ? (req.file.path || req.file.secure_url || req.file.url || null) : null;
    if (req.file && !proofUrl) {
      return res.status(500).json({ status: 'error', message: 'Impossible de lire la capture envoyee.' });
    }

    const now = new Date();
    const normalizedProofReference = normalizedMethod === 'ORANGE_MONEY'
      ? String(proofReference).toUpperCase()
      : proofReference;
    const reference = appointment.payment?.reference || buildPaymentReference('APTPAY');
    const transactionId = normalizedProofReference;

    const savedPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.upsert({
        where: { appointmentId: id },
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
          proofImageUrl: proofUrl || appointment.payment?.proofImageUrl || null,
          proofReference: normalizedProofReference,
          proofNote: proofNote || appointment.payment?.proofNote || null,
          proofStatus: 'PENDING',
          proofSubmittedAt: now,
          proofReviewedAt: null,
          proofReviewedBy: null,
          proofRejectionReason: null,
          completedAt: null,
          reference,
          userId: appointment.clientId,
        },
        create: {
          appointmentId: id,
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
          proofImageUrl: proofUrl,
          proofReference: normalizedProofReference,
          proofNote,
          proofStatus: 'PENDING',
          proofSubmittedAt: now,
          userId: appointment.clientId,
        },
      });

      await tx.appointment.update({
        where: { id },
        data: { status: 'PENDING_PAYMENT' },
      });

      return payment;
    });

    if (appointment.salon?.ownerId) {
      try {
        const notification = await prisma.notification.create({
          data: {
            userId: appointment.salon.ownerId,
            type: 'payment',
            message: `Paiement direct a verifier pour la reservation ${id.slice(-8).toUpperCase()} (${toFriendlyPaymentMethodLabel(normalizedMethod)}).`,
          },
        });
        pushNotification(notification.userId, notification);
      } catch (e) {
        console.error('Appointment payment proof notify owner error:', e.message);
      }
    }

    try {
      const notification = await prisma.notification.create({
        data: {
          userId: appointment.clientId,
          type: 'payment',
          message: `Votre preuve de paiement a ete envoyee chez ${appointment.salon?.name || 'le salon'}. Verification en cours.`,
        },
      });
      pushNotification(notification.userId, notification);
    } catch (e) {
      console.error('Appointment payment proof notify client error:', e.message);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Demande de verification de paiement envoyee avec succes.',
      data: {
        appointmentId: id,
        payment: savedPayment,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Get messages for one appointment (client <-> pro)
 * GET /api/appointments/:id/messages
 */
router.get('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { salon: { select: { ownerId: true } } },
    });
    if (!appointment) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found' });
    }
    if (!canAccessAppointment(appointment, req.user)) {
      return res.status(403).json({ status: 'error', message: 'Access denied' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { appointmentId: id },
      include: {
        sender: { select: { id: true, name: true, picture: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({ status: 'success', data: { messages } });
  } catch (error) {
    next(error);
  }
});

/**
 * Send message (text and/or vocal) for an appointment
 * POST /api/appointments/:id/messages
 */
router.post('/:id/messages', authenticate, uploadVoice.single('voice'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const text = String(req.body?.text || '').trim();
    const voiceUrl = req.file ? (req.file.path || req.file.secure_url || req.file.url) : null;
    if (!text && !voiceUrl) {
      return res.status(400).json({ status: 'error', message: 'Message text or voice is required' });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { salon: { select: { ownerId: true, name: true } }, client: { select: { id: true, name: true } } },
    });
    if (!appointment) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found' });
    }
    if (!canAccessAppointment(appointment, req.user)) {
      return res.status(403).json({ status: 'error', message: 'Access denied' });
    }

    const message = await prisma.chatMessage.create({
      data: {
        appointmentId: id,
        senderId: req.user.id,
        text: text || null,
        audioUrl: voiceUrl,
      },
      include: {
        sender: { select: { id: true, name: true, picture: true, role: true } },
      },
    });

    const recipientId = req.user.id === appointment.clientId
      ? appointment.salon?.ownerId
      : appointment.clientId;
    if (recipientId && recipientId !== req.user.id) {
      try {
        const notification = await prisma.notification.create({
          data: {
            userId: recipientId,
            type: 'chat',
            message: `Nouveau message pour la réservation chez ${appointment.salon?.name || 'le salon'}.`,
          },
        });
        pushNotification(notification.userId, notification);
        pushChatMessage(recipientId, { appointmentId: id, message });
      } catch (e) {
        console.error('Notification chat error:', e.message);
      }
    }

    res.status(201).json({ status: 'success', data: { message } });
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
          select: { id: true, name: true, email: true, picture: true, phoneNumber: true, address: true },
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
      ((req.user.role === 'PRO' || req.user.role === 'SALON_OWNER') && appointment.salon.ownerId === req.user.id);

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

    const validStatuses = ['PENDING_PAYMENT', 'PAID', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'CONFIRMED_ON_SITE'];
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
      ((req.user.role === 'PRO' || req.user.role === 'SALON_OWNER') && appointment.salon.ownerId === req.user.id) ||
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


