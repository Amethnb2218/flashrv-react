const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const prisma = new PrismaClient();

/**
 * Get all users (admin only)
 * GET /api/users
 */
router.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        picture: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get user by ID
 * GET /api/users/:id
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless admin
    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'You can only view your own profile',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        picture: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update current user profile
 * PUT /api/users/update-profile
 */
router.put('/update-profile', authenticate, async (req, res, next) => {
  try {
    const { name, username, email, phoneNumber, address, picture } = req.body || {};
    const userId = req.user.id;

    if (email !== undefined) {
      const nextEmail = String(email || '').trim();
      if (!nextEmail) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is required',
        });
      }
      const existing = await prisma.user.findFirst({
        where: {
          email: nextEmail,
          id: { not: userId },
        },
        select: { id: true },
      });
      if (existing) {
        return res.status(409).json({
          status: 'error',
          message: 'Email already in use',
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(username !== undefined && { username }),
        ...(email !== undefined && { email: String(email || '').trim() }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(address !== undefined && { address }),
        ...(picture !== undefined && { picture }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        picture: true,
        role: true,
        phoneNumber: true,
        address: true,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Profil mis à jour',
      data: { user: updated },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update user role (admin only)
 * PATCH /api/users/:id/role
 */
router.patch('/:id/role', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['CLIENT', 'COIFFEUR', 'SALON_OWNER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'User role updated',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
