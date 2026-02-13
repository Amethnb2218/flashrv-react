const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, optionalAuth, authorize, ROLES, STATUS } = require('../middleware/auth');

// Multer for file uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadsDir, uploadsSubdir } = require('../utils/paths');
const { pushNotification } = require('../realtime/hub');

// Initialiser Prisma
const prisma = new PrismaClient();

const attachServiceImages = async (salon) => {
  if (!salon || !Array.isArray(salon.services) || salon.services.length === 0) {
    return salon;
  }
  const serviceIds = salon.services.map((s) => s.id).filter(Boolean);
  if (!serviceIds.length) return salon;
  const images = await prisma.serviceImage.findMany({
    where: { serviceId: { in: serviceIds } },
    orderBy: { createdAt: 'asc' },
  });
  const byService = images.reduce((acc, img) => {
    if (!acc[img.serviceId]) acc[img.serviceId] = [];
    acc[img.serviceId].push(img);
    return acc;
  }, {});
  salon.services = salon.services.map((s) => ({
    ...s,
    images: byService[s.id] || [],
  }));
  return salon;
};

// Set up Multer storage for gallery images
const uploadDir = uploadsSubdir('gallery');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// Multer storage for salon cover image
const salonImageDir = uploadsSubdir('salon');
if (!fs.existsSync(salonImageDir)) fs.mkdirSync(salonImageDir, { recursive: true });
const salonImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, salonImageDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `salon-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});
const uploadSalonImage = multer({ storage: salonImageStorage });

/**
 * Upload an image to the salon gallery
 * POST /api/salons/:id/gallery
 * Requires: Authentication + Owner or ADMIN
 * Body: multipart/form-data { image: File, caption?: string, category?: string }
 */
router.post('/:id/gallery', authenticate, upload.single('image'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const salon = await prisma.salon.findUnique({ where: { id } });
    if (!salon) {
      return res.status(404).json({ status: 'error', message: 'Salon not found' });
    }
    if (salon.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ status: 'error', message: 'You do not have permission to update this salon' });
    }
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'Image file is required' });
    }
    const relPath = `/uploads/gallery/${req.file.filename}`;
    const { caption, category } = req.body;
    const galleryImage = await prisma.galleryImage.create({
      data: {
        url: relPath,
        caption: caption || null,
        category: category || null,
        salonId: id,
      },
    });
    res.status(201).json({ status: 'success', data: galleryImage });
  } catch (error) {
    next(error);
  }
}); // <-- Fermeture manquante ici

/**
 * Delete a gallery image
 * DELETE /api/salons/:salonId/gallery/:imageId
 * Requires: Authentication + Owner or ADMIN
 */
router.delete('/:salonId/gallery/:imageId', authenticate, async (req, res, next) => {
  try {
    const { salonId, imageId } = req.params;
    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) {
      return res.status(404).json({ status: 'error', message: 'Salon not found' });
    }
    if (salon.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ status: 'error', message: 'You do not have permission to update this salon' });
    }
    const image = await prisma.galleryImage.findUnique({ where: { id: imageId } });
    if (!image || image.salonId !== salonId) {
      return res.status(404).json({ status: 'error', message: 'Image not found' });
    }
    // Supprimer le fichier physique si présent
    if (image.url && image.url.startsWith('/uploads/gallery/')) {
      const relativeUploadPath = String(image.url).replace(/^\/?uploads\/?/, '');
      const filePath = path.join(uploadsDir, relativeUploadPath);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
      }
    }
    await prisma.galleryImage.delete({ where: { id: imageId } });
    res.json({ status: 'success', message: 'Image supprimée' });
  } catch (error) {
    next(error);
  }
});

/**
 * Get salon data for the authenticated owner
 * GET /api/salons/me
 * Requires: Authentication
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    // 1. Cherche le salon lié à l'utilisateur connecté (ownerId)
    let salon = await prisma.salon.findFirst({
      where: { ownerId: req.user.id },
      include: {
        services: { where: { isActive: true }, orderBy: { category: 'asc' } },
        coiffeurs: { where: { isAvailable: true }, include: { user: { select: { name: true, picture: true } } } },
        openingHours: { orderBy: { dayOfWeek: 'asc' } },
        salonSettings: true,
        reviews: { include: { user: { select: { name: true, picture: true } } }, orderBy: { createdAt: 'desc' }, take: 10 },
        gallery: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (salon) {
      salon = await attachServiceImages(salon);
    }

    // Si aucun salon, ne pas créer automatiquement (doit passer par onboarding)
    if (!salon) {
      return res.status(404).json({
        status: 'error',
        message: 'Salon introuvable. Créez votre salon via l’onboarding.',
        code: 'SALON_NOT_FOUND',
      });
    }

    // Ajoute media (URL complet) à chaque image de la galerie
    const apiBase = process.env.VITE_API_URL || process.env.API_URL || `http://localhost:${process.env.PORT || 4000}/api`;
    const backendBase = apiBase.replace(/\/api$/, '');
    const gallery = (salon.gallery || []).map(img => ({
      ...img,
      type: 'gallery',
      media: img.url ? backendBase.replace(/\/$/, '') + img.url : '',
    }));
    res.status(200).json({
      status: 'success',
      data: {
        id: salon.id,
        ...salon,
        gallery,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Upload salon cover image (owner only)
 * POST /api/salons/me/image
 */
router.post('/me/image', authenticate, uploadSalonImage.single('image'), async (req, res, next) => {
  try {
    const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
    if (!salon) {
      return res.status(404).json({ status: 'error', message: 'Salon not found' });
    }
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'Image file is required' });
    }
    const relPath = `/uploads/salon/${req.file.filename}`;
    const updated = await prisma.salon.update({
      where: { id: salon.id },
      data: { image: relPath },
    });
    res.status(200).json({ status: 'success', data: { image: updated.image } });
  } catch (error) {
    next(error);
  }
});

/**
 * Update salon settings for the authenticated owner
 * PATCH /api/salons/me
 * Requires: Authentication
 */
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
    if (!salon) {
      return res.status(404).json({ status: 'error', message: 'Salon not found' });
    }

    const {
      name,
      description,
      address,
      city,
      phone,
      email,
      salonType,
      image,
      isOpen,
      whatsapp,
      openingHours,
    } = req.body || {};

    await prisma.salon.update({
      where: { id: salon.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(address && { address }),
        ...(city && { city }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(salonType && { salonType }),
        ...(image !== undefined && { image: image || null }),
        ...(isOpen !== undefined && { isOpen }),
      },
    });

    let hoursPayload = openingHours;
    if (typeof hoursPayload === 'string') {
      try {
        hoursPayload = JSON.parse(hoursPayload);
      } catch (e) {
        hoursPayload = null;
      }
    }

    if (Array.isArray(hoursPayload)) {
      const mapped = hoursPayload
        .map((h) => ({
          dayOfWeek: Number(h.dayOfWeek),
          openTime: (h.openTime || '09:00'),
          closeTime: (h.closeTime || '18:00'),
          isClosed: !!h.isClosed,
        }))
        .filter((h) => !Number.isNaN(h.dayOfWeek));

      await prisma.$transaction(
        mapped.map((h) =>
          prisma.openingHour.upsert({
            where: { salonId_dayOfWeek: { salonId: salon.id, dayOfWeek: h.dayOfWeek } },
            update: { openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed },
            create: { salonId: salon.id, dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed },
          })
        )
      );
    }

    if (whatsapp !== undefined) {
      let prefs = {};
      const existing = await prisma.salonSettings.findUnique({ where: { salonId: salon.id } });
      if (existing && existing.preferences) {
        try { prefs = JSON.parse(existing.preferences); } catch (e) { prefs = {}; }
      }
      prefs.whatsapp = String(whatsapp || '').trim();
      await prisma.salonSettings.upsert({
        where: { salonId: salon.id },
        update: { preferences: JSON.stringify(prefs) },
        create: { salonId: salon.id, preferences: JSON.stringify(prefs) },
      });
    }

    const fresh = await prisma.salon.findUnique({
      where: { id: salon.id },
      include: {
        openingHours: { orderBy: { dayOfWeek: 'asc' } },
        salonSettings: true,
      },
    });

    res.status(200).json({ status: 'success', data: fresh });
  } catch (error) {
    next(error);
  }
});
/**
 * Get all salons
 * GET /api/salons
 * Query params: city, salonType, search, page, limit
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { city, salonType, search, page = 1, limit = 10, ownerId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const searchValue = typeof search === 'string' ? search.trim() : '';
    const searchVariants = searchValue
      ? Array.from(new Set([
          searchValue,
          searchValue.toLowerCase(),
          searchValue.toUpperCase(),
          searchValue.charAt(0).toUpperCase() + searchValue.slice(1).toLowerCase(),
        ].filter(Boolean)))
      : [];

    const where = {
      isOpen: true,
      ...(ownerId && { ownerId }),
      owner: {
        status: STATUS.APPROVED,
        role: ROLES.PRO,
      },
      ...(city && { city: { contains: city } }),
      ...(salonType && { salonType }),
      ...(searchVariants.length && {
        OR: searchVariants.flatMap((term) => ([
          { name: { contains: term } },
          { description: { contains: term } },
          { city: { contains: term } },
          { address: { contains: term } },
          { phone: { contains: term } },
          { email: { contains: term } },
        ])),
      }),
    };

    const [salons, total] = await Promise.all([
      prisma.salon.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          services: {
            where: { isActive: true },
            select: { id: true, name: true, price: true, duration: true, category: true, imageUrl: true },
          },
          coiffeurs: {
            where: { isAvailable: true },
            include: {
              user: {
                select: { name: true, picture: true },
              },
            },
          },
          openingHours: { orderBy: { dayOfWeek: 'asc' } },
          _count: {
            select: { reviews: true },
          },
        },
        orderBy: { rating: 'desc' },
      }),
      prisma.salon.count({ where }),
    ]);

    const salonIds = salons.map((s) => s.id);
    const ratingsAgg = salonIds.length
      ? await prisma.review.groupBy({
          by: ['salonId'],
          where: { salonId: { in: salonIds } },
          _avg: { rating: true },
          _count: { _all: true },
        })
      : [];
    const ratingMap = new Map(
      ratingsAgg.map((r) => [
        r.salonId,
        {
          rating: r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : 0,
          reviewCount: r._count._all || 0,
        },
      ])
    );

    const salonsWithRatings = salons.map((s) => {
      const agg = ratingMap.get(s.id);
      return {
        ...s,
        rating: agg ? agg.rating : s.rating || 0,
        reviewCount: agg ? agg.reviewCount : s.reviewCount || 0,
      };
    });
    res.status(200).json({
      status: 'success',
      results: salonsWithRatings.length,
      total,
      page: parseInt(page),
      totalPages: Math.max(1, Math.ceil(total / parseInt(limit))),
      data: { salons: salonsWithRatings },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get salon by ID
 * GET /api/salons/:id
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    let salon = await prisma.salon.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true, status: true },
        },
        services: {
          where: { isActive: true },
          orderBy: { category: 'asc' },
        },
        coiffeurs: {
          where: { isAvailable: true },
          include: {
            user: {
              select: { name: true, picture: true },
            },
            availability: {
              where: {
                date: { gte: new Date() },
                isBooked: false,
              },
            },
          },
        },
        reviews: {
          include: {
            user: {
              select: { name: true, picture: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        openingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
        gallery: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const isOwner = req.user && salon && salon.ownerId === req.user.id;
    const isAdmin = req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN');
    const ownerStatus = salon?.owner?.status ? String(salon.owner.status).toUpperCase() : '';
    const isPublic = ownerStatus === STATUS.APPROVED;
    if (!salon || (!isOwner && !isAdmin && !isPublic)) {
      return res.status(404).json({
        status: 'error',
        message: 'Salon not found',
      });
    }

    salon = await attachServiceImages(salon);

    const reviewAgg = await prisma.review.aggregate({
      where: { salonId: id },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const computedRating = reviewAgg._avg.rating
      ? Math.round(reviewAgg._avg.rating * 10) / 10
      : 0;
    salon = {
      ...salon,
      rating: computedRating,
      reviewCount: reviewAgg._count._all || 0,
    };

    res.status(200).json({
      status: 'success',
      data: { salon },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new salon
 * POST /api/salons
 * Requires: Authentication + SALON_OWNER or ADMIN role
 */
router.post('/', authenticate, authorize('PRO', 'SALON_OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const { name, description, address, city, phone, salonType, image, status } = req.body;

    // Validate required fields
    if (!name || !address || !city) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, address, and city are required',
      });
    }
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required to create a salon',
      });
    }

    const existing = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: 'Un salon existe déjà pour ce compte. Utilisez l’onboarding pour le compléter.',
        data: { salon: existing },
      });
    }

    const ownerStatus = String(req.user.status || '').toUpperCase();
    const autoStatus = ownerStatus === 'APPROVED' ? 'APPROVED' : 'PENDING';
    const salon = await prisma.salon.create({
      data: {
        name,
        description,
        address,
        city,
        phone,
        email: req.user.email,
        salonType: salonType || 'mixte',
        image: image || null,
        status: status || autoStatus,
        owner: { connect: { id: req.user.id } },
      },
    });

    res.status(201).json({
      status: 'success',
      message: 'Salon created successfully',
      data: { salon },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update salon
 * PATCH /api/salons/:id
 * Requires: Authentication + Owner or ADMIN
 */
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check ownership
    const salon = await prisma.salon.findUnique({
      where: { id },
    });

    if (!salon) {
      return res.status(404).json({
        status: 'error',
        message: 'Salon not found',
      });
    }

    if (salon.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this salon',
      });
    }

    const { name, description, address, city, phone, email, salonType, image, isOpen } = req.body;

    const updatedSalon = await prisma.salon.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(address && { address }),
        ...(city && { city }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(salonType && { salonType }),
        ...(image && { image }),
        ...(isOpen !== undefined && { isOpen }),
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Salon updated successfully',
      data: { salon: updatedSalon },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete salon
 * DELETE /api/salons/:id
 * Requires: Authentication + Owner or ADMIN
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const salon = await prisma.salon.findUnique({
      where: { id },
    });

    if (!salon) {
      return res.status(404).json({
        status: 'error',
        message: 'Salon not found',
      });
    }

    if (salon.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete this salon',
      });
    }

    await prisma.salon.delete({
      where: { id },
    });

    res.status(200).json({
      status: 'success',
      message: 'Salon deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Add a service to a salon
 * POST /api/salons/:id/services
 */
router.post('/:id/services', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const salon = await prisma.salon.findUnique({ where: { id } });

    if (!salon) {
      return res.status(404).json({
        status: 'error',
        message: 'Salon not found',
      });
    }

    if (salon.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to add services to this salon',
      });
    }

    const { name, description, price, duration, category } = req.body;

    if (!name || !price || !duration || !category) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, price, duration, and category are required',
      });
    }

    const service = await prisma.service.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        duration: parseInt(duration),
        category,
        salonId: id,
      },
    });

    res.status(201).json({
      status: 'success',
      message: 'Service added successfully',
      data: { service },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Add a review to a salon
 * POST /api/salons/:id/reviews
 */
router.post('/:id/reviews', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating is required and must be between 1 and 5',
      });
    }

    const salon = await prisma.salon.findUnique({ where: { id } });

    if (!salon) {
      return res.status(404).json({
        status: 'error',
        message: 'Salon not found',
      });
    }

    // Check if user already reviewed this salon
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_salonId: {
          userId: req.user.id,
          salonId: id,
        },
      },
    });

    let review;
    if (existingReview) {
      // Update existing review
      review = await prisma.review.update({
        where: { id: existingReview.id },
        data: { rating, comment },
      });
    } else {
      // Create new review
      review = await prisma.review.create({
        data: {
          rating,
          comment,
          userId: req.user.id,
          salonId: id,
        },
      });
    }

    // Update salon rating
    const reviews = await prisma.review.findMany({
      where: { salonId: id },
    });

    const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;

    await prisma.salon.update({
      where: { id },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length,
      },
    });

    if (salon.ownerId && salon.ownerId !== req.user.id) {
      try {
        const notification = await prisma.notification.create({
          data: {
            userId: salon.ownerId,
            type: 'review',
            message: `Nouvel avis (${rating}/5) reçu pour votre salon.`,
          },
        });
        pushNotification(notification.userId, notification);
      } catch (e) {
        console.error('Notification review error:', e.message);
      }
    }

    res.status(201).json({
      status: 'success',
      message: existingReview ? 'Review updated' : 'Review added',
      data: { review },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;




