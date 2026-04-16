const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { cloudinary, cloudinaryFolders, extractCloudinaryPublicId } = require('../config/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const rateLimit = require('express-rate-limit');

const PROFILE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[A-Za-z0-9._-]{3,40}$/;
const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const avatarUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Trop de tentatives d upload avatar. Reessayez plus tard.' },
});

const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Trop de mises a jour du profil. Reessayez plus tard.' },
});

const cleanString = (value, max = 160) => {
  if (value == null) return undefined;
  const normalized = String(value).trim();
  if (!normalized) return '';
  return normalized.slice(0, max);
};

const normalizeEmail = (value) => {
  const normalized = cleanString(value, 160);
  return normalized ? normalized.toLowerCase() : normalized;
};

const sanitizePictureUrl = (value) => {
  if (value == null) return undefined;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (normalized.startsWith('/uploads/')) return normalized;

  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:') return null;
    return url.toString();
  } catch (_) {
    return null;
  }
};

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: cloudinaryFolders.avatars,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }],
  },
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_AVATAR_MIME_TYPES.has(String(file.mimetype || '').toLowerCase())) {
      return cb(new Error('Seules les images JPEG, PNG, WebP et GIF sont autorisees'));
    }
    cb(null, true);
  },
});

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
    if (req.user.id !== id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
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
/**
 * Upload avatar
 * POST /api/users/upload-avatar
 */
router.post('/upload-avatar', authenticate, avatarUploadLimiter, uploadAvatar.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'Aucun fichier envoyé' });
    }
    const avatarUrl = req.file.path || req.file.secure_url || req.file.url;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { picture: avatarUrl },
    });
    res.json({ status: 'success', avatarUrl });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete avatar
 * DELETE /api/users/delete-avatar
 */
router.delete('/delete-avatar', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { picture: true } });
    if (user?.picture && user.picture.includes('cloudinary')) {
      const publicId = extractCloudinaryPublicId(user.picture);
      if (publicId) {
        try { await cloudinary.uploader.destroy(publicId); } catch (e) { /* ignore */ }
      }
    }
    await prisma.user.update({
      where: { id: req.user.id },
      data: { picture: null },
    });
    res.json({ status: 'success', message: 'Avatar supprimé' });
  } catch (error) {
    next(error);
  }
});

router.put('/update-profile', authenticate, profileUpdateLimiter, async (req, res, next) => {
  try {
    const { name, username, email, phoneNumber, address, picture } = req.body || {};
    const userId = req.user.id;
    const nextName = cleanString(name, 120);
    const nextUsername = cleanString(username, 40);
    const nextEmail = normalizeEmail(email);
    const nextPhoneNumber = cleanString(phoneNumber, 40);
    const nextAddress = cleanString(address, 220);
    const nextPicture = sanitizePictureUrl(picture);

    if (username !== undefined && nextUsername && !USERNAME_RE.test(nextUsername)) {
      return res.status(400).json({
        status: 'error',
        message: 'Nom d utilisateur invalide.',
      });
    }

    if (email !== undefined) {
      if (!nextEmail) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is required',
        });
      }
      if (!PROFILE_EMAIL_RE.test(nextEmail)) {
        return res.status(400).json({
          status: 'error',
          message: 'Email invalide',
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

    if (picture !== undefined && nextPicture === null) {
      return res.status(400).json({
        status: 'error',
        message: 'URL d image invalide',
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name: nextName }),
        ...(username !== undefined && { username: nextUsername }),
        ...(email !== undefined && { email: nextEmail }),
        ...(phoneNumber !== undefined && { phoneNumber: nextPhoneNumber }),
        ...(address !== undefined && { address: nextAddress }),
        ...(picture !== undefined && { picture: nextPicture }),
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
    const requestedRole = String(req.body?.role || '').trim().toUpperCase();
    const actorRole = String(req.user?.role || '').trim().toUpperCase();

    const validRoles = ['CLIENT', 'COIFFEUR', 'SALON_OWNER', 'ADMIN'];
    if (!validRoles.includes(requestedRole)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true, name: true },
    });

    if (!targetUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    const targetRole = String(targetUser.role || '').trim().toUpperCase();
    const isSuperAdmin = actorRole === 'SUPER_ADMIN';

    if (requestedRole === 'ADMIN' && !isSuperAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Only SUPER_ADMIN can promote a user to ADMIN',
      });
    }

    if (targetRole === 'ADMIN' && !isSuperAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Only SUPER_ADMIN can modify another ADMIN account',
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: requestedRole },
      select: { id: true, email: true, name: true, role: true },
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
