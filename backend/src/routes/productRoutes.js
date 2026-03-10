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

const parseListField = (value) => {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((v) => String(v || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return [];
    if (
      (raw.startsWith('[') && raw.endsWith(']')) ||
      (raw.startsWith('{') && raw.endsWith('}'))
    ) {
      try {
        const parsed = JSON.parse(raw);
        return parseListField(parsed);
      } catch (_) {
        // fallback below
      }
    }
    return raw.split(/[;,|/]/g).map((v) => String(v || '').trim()).filter(Boolean);
  }
  if (typeof value === 'object') {
    if (Array.isArray(value.values)) return parseListField(value.values);
    if (Array.isArray(value.options)) return parseListField(value.options);
    return Object.values(value).map((v) => String(v || '').trim()).filter(Boolean);
  }
  return [];
};

const parseBooleanField = (value) => {
  if (value === true || value === false) return value;
  const key = String(value || '').trim().toLowerCase();
  if (key === 'true' || key === '1' || key === 'yes' || key === 'oui') return true;
  if (key === 'false' || key === '0' || key === 'no' || key === 'non') return false;
  return null;
};

/**
 * POST /api/products
 * Create a product (boutique owner only)
 */
router.post('/', authenticate, uploadProductImages, async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      stock,
      category,
      imageUrl,
      sizes,
      colors,
      availableColors,
      isDeliverable,
      deliveryZones,
      deliveryFee,
    } = req.body;
    const userId = req.user.id;

    const parsedSizes = parseListField(sizes);
    const parsedColors = Array.from(new Set(parseListField(colors)));
    const parsedAvailableColors = Array.from(new Set(parseListField(availableColors)));
    const deliverableFlag = parseBooleanField(isDeliverable);
    const parsedDeliveryZones = Array.from(new Set(parseListField(deliveryZones)));
    const parsedDeliveryFee = Number(deliveryFee || 0);

    if (parsedAvailableColors.length > 0 && parsedColors.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Ajoutez les couleurs du produit avant d\'indiquer les couleurs disponibles.' });
    }
    if (parsedAvailableColors.some((c) => !parsedColors.includes(c))) {
      return res.status(400).json({
        status: 'error',
        message: 'Les couleurs disponibles doivent faire partie des couleurs du produit.',
      });
    }
    if (deliverableFlag === null) {
      return res.status(400).json({
        status: 'error',
        message: 'Precisez si le produit est livrable ou retrait uniquement.',
      });
    }
    if (deliverableFlag && parsedDeliveryZones.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Au moins une zone de livraison est requise.',
      });
    }
    if (!Number.isFinite(parsedDeliveryFee) || parsedDeliveryFee < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Frais de livraison invalides.',
      });
    }

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
        sizes: parsedSizes.length > 0 ? JSON.stringify(parsedSizes) : null,
        colors: JSON.stringify(parsedColors),
        availableColors: JSON.stringify(parsedAvailableColors),
        isDeliverable: deliverableFlag,
        deliveryZones: deliverableFlag && parsedDeliveryZones.length > 0 ? JSON.stringify(parsedDeliveryZones) : null,
        deliveryFee: deliverableFlag ? parsedDeliveryFee : 0,
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
    const {
      name,
      description,
      price,
      stock,
      category,
      imageUrl,
      isActive,
      sizes,
      colors,
      availableColors,
      isDeliverable,
      deliveryZones,
      deliveryFee,
    } = req.body;

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
    const existingColors = Array.from(new Set(parseListField(product.colors)));
    const existingAvailableColors = Array.from(new Set(parseListField(product.availableColors)));
    const existingZones = Array.from(new Set(parseListField(product.deliveryZones)));

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (stock !== undefined) updateData.stock = parseInt(stock, 10);
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive === true || isActive === 'true';

    if (sizes !== undefined) {
      const parsedSizes = Array.from(new Set(parseListField(sizes)));
      updateData.sizes = parsedSizes.length > 0 ? JSON.stringify(parsedSizes) : null;
    }

    let nextColors = existingColors;
    if (colors !== undefined) {
      const parsedColors = Array.from(new Set(parseListField(colors)));
      nextColors = parsedColors;
      updateData.colors = parsedColors.length > 0 ? JSON.stringify(parsedColors) : null;
    }

    let nextAvailableColors = existingAvailableColors;
    if (availableColors !== undefined) {
      const parsedAvailableColors = Array.from(new Set(parseListField(availableColors)));
      nextAvailableColors = parsedAvailableColors;
      updateData.availableColors = parsedAvailableColors.length > 0 ? JSON.stringify(parsedAvailableColors) : null;
    }
    if (nextColors.length === 0 && nextAvailableColors.length > 0) {
      updateData.availableColors = null;
      nextAvailableColors = [];
    }
    if (nextAvailableColors.length > 0 && nextAvailableColors.some((c) => !nextColors.includes(c))) {
      return res.status(400).json({
        status: 'error',
        message: 'Les couleurs disponibles doivent faire partie des couleurs du produit.',
      });
    }

    const parsedDeliverable = isDeliverable !== undefined ? parseBooleanField(isDeliverable) : null;
    if (isDeliverable !== undefined && parsedDeliverable === null) {
      return res.status(400).json({
        status: 'error',
        message: 'Valeur de livrabilite invalide.',
      });
    }
    const nextDeliverable = parsedDeliverable === null ? Boolean(product.isDeliverable) : parsedDeliverable;
    if (parsedDeliverable !== null) updateData.isDeliverable = parsedDeliverable;

    let nextZones = existingZones;
    if (deliveryZones !== undefined) {
      nextZones = Array.from(new Set(parseListField(deliveryZones)));
      updateData.deliveryZones = nextZones.length > 0 ? JSON.stringify(nextZones) : null;
    }
    if (nextDeliverable && nextZones.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Au moins une zone de livraison est requise.',
      });
    }
    if (!nextDeliverable) {
      updateData.deliveryZones = null;
      updateData.deliveryFee = 0;
    }

    if (deliveryFee !== undefined) {
      const parsedDeliveryFee = Number(deliveryFee || 0);
      if (!Number.isFinite(parsedDeliveryFee) || parsedDeliveryFee < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Frais de livraison invalides.',
        });
      }
      updateData.deliveryFee = nextDeliverable ? parsedDeliveryFee : 0;
    }

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
