const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { uploadProductImages: cloudinaryProductUpload } = require('../config/cloudinary');

// Cloudinary-based upload
const uploadProductImages = cloudinaryProductUpload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 10 },
]);

/**
 * POST /api/products
 * Create a product (boutique owner only)
 */
router.post('/', authenticate, uploadProductImages, async (req, res, next) => {
  try {
    const { name, description, price, stock, category, imageUrl } = req.body;
    const userId = req.user.id;

    const salon = await prisma.salon.findFirst({
      where: { ownerId: userId, businessType: 'BOUTIQUE' },
    });
    if (!salon) {
      return res.status(400).json({ status: 'error', message: 'Boutique introuvable' });
    }

    const imageUrls = [];
    const files = [...(req.files?.image || []), ...(req.files?.images || [])];
    for (const file of files) {
      imageUrls.push(file.path || file.secure_url || file.url || `/uploads/${file.filename}`);
    }

    const mainImage = imageUrls[0] || imageUrl || null;

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        stock: parseInt(stock || '0', 10),
        category: category || null,
        imageUrl: mainImage,
        salonId: salon.id,
        images: imageUrls.length > 0
          ? { create: imageUrls.map((url) => ({ url })) }
          : undefined,
      },
      include: { images: true },
    });

    res.status(201).json({ status: 'success', data: product });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/products
 * Get products for the authenticated boutique owner, or all if admin
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      const products = await prisma.product.findMany({ include: { images: true } });
      return res.json(products);
    }

    const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
    if (!salon) return res.json([]);

    const products = await prisma.product.findMany({
      where: { salonId: salon.id },
      include: { images: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/products/boutique/:salonId
 * Get products for a specific boutique (public)
 */
router.get('/boutique/:salonId', async (req, res, next) => {
  try {
    const { salonId } = req.params;
    const products = await prisma.product.findMany({
      where: { salonId, isActive: true },
      include: { images: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/products/:id
 * Update a product
 */
router.patch('/:id', authenticate, uploadProductImages, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, category, imageUrl, isActive } = req.body;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { salon: true },
    });
    if (!product) return res.status(404).json({ status: 'error', message: 'Produit introuvable' });

    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      if (!product.salon || product.salon.ownerId !== req.user.id) {
        return res.status(403).json({ status: 'error', message: 'Accès interdit' });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (stock !== undefined) updateData.stock = parseInt(stock, 10);
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive === true || isActive === 'true';

    const imageUrls = [];
    const files = [...(req.files?.image || []), ...(req.files?.images || [])];
    for (const file of files) {
      imageUrls.push(file.path || file.secure_url || file.url);
    }

    if (imageUrls.length > 0) {
      updateData.imageUrl = imageUrls[0];
      updateData.images = {
        deleteMany: {},
        create: imageUrls.map((url) => ({ url })),
      };
    } else if (imageUrl) {
      updateData.imageUrl = imageUrl;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { images: true },
    });
    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/products/:id
 * Delete a product
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { salon: true },
    });
    if (!product) return res.status(404).json({ status: 'error', message: 'Produit introuvable' });

    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      if (!product.salon || product.salon.ownerId !== req.user.id) {
        return res.status(403).json({ status: 'error', message: 'Accès interdit' });
      }
    }

    await prisma.product.delete({ where: { id } });
    res.json({ status: 'success', message: 'Produit supprimé' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
