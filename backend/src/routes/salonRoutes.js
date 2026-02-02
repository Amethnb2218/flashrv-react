const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');

const prisma = new PrismaClient();

/**
 * Get all salons
 * GET /api/salons
 * Query params: city, salonType, search, page, limit
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { city, salonType, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isOpen: true,
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(salonType && { salonType }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
        ],
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
            select: { id: true, name: true, price: true, duration: true, category: true },
          },
          coiffeurs: {
            where: { isAvailable: true },
            include: {
              user: {
                select: { name: true, picture: true },
              },
            },
          },
          openingHours: true,
          _count: {
            select: { reviews: true },
          },
        },
        orderBy: { rating: 'desc' },
      }),
      prisma.salon.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      results: salons.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: { salons },
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

    const salon = await prisma.salon.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
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

    if (!salon) {
      return res.status(404).json({
        status: 'error',
        message: 'Salon not found',
      });
    }

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
router.post('/', authenticate, authorize('SALON_OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const { name, description, address, city, postalCode, phone, email, salonType, image } = req.body;

    // Validate required fields
    if (!name || !address || !city || !postalCode) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, address, city, and postal code are required',
      });
    }

    const salon = await prisma.salon.create({
      data: {
        name,
        description,
        address,
        city,
        postalCode,
        phone,
        email,
        salonType: salonType || 'mixte',
        image,
        ownerId: req.user.id,
      },
    });

    // Create default opening hours (Mon-Sat 9:00-19:00, Sun closed)
    const defaultHours = [
      { dayOfWeek: 0, openTime: '09:00', closeTime: '19:00', isClosed: true }, // Sunday
      { dayOfWeek: 1, openTime: '09:00', closeTime: '19:00', isClosed: false },
      { dayOfWeek: 2, openTime: '09:00', closeTime: '19:00', isClosed: false },
      { dayOfWeek: 3, openTime: '09:00', closeTime: '19:00', isClosed: false },
      { dayOfWeek: 4, openTime: '09:00', closeTime: '19:00', isClosed: false },
      { dayOfWeek: 5, openTime: '09:00', closeTime: '19:00', isClosed: false },
      { dayOfWeek: 6, openTime: '09:00', closeTime: '18:00', isClosed: false }, // Saturday
    ];

    await prisma.openingHour.createMany({
      data: defaultHours.map((hour) => ({
        ...hour,
        salonId: salon.id,
      })),
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

    const { name, description, address, city, postalCode, phone, email, salonType, image, isOpen } = req.body;

    const updatedSalon = await prisma.salon.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(address && { address }),
        ...(city && { city }),
        ...(postalCode && { postalCode }),
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
