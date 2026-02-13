

// ...déclarations des dépendances et du router...


// ...initialisation des dépendances et du router...

// PATCH /api/services/:id (mise à jour d'un service avec image)
// (doit être placé après l'initialisation de router)

// (le code de la route PATCH sera replacé plus bas)
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { uploadsDir } = require('../utils/paths');

// Multer config (chemin unique, sûr)
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = file.fieldname + '-' + Date.now() + ext;
    cb(null, name);
  },
});
const upload = multer({ storage });
const uploadServiceImages = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 10 },
]);

const normalizeImagesInput = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      // fallthrough
    }
    return input
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const collectServiceImages = (req) => {
  const urls = [];
  const files = [
    ...(req.files?.image || []),
    ...(req.files?.images || []),
  ];
  for (const file of files) {
    urls.push(`/uploads/${file.filename}`);
  }
  const bodyImages = normalizeImagesInput(req.body.images);
  const extraImages = normalizeImagesInput(req.body.imageUrls);
  urls.push(...bodyImages, ...extraImages);
  if (req.body.imageUrl || req.body.media) {
    urls.push(req.body.imageUrl || req.body.media);
  }
  return Array.from(new Set(urls.filter(Boolean)));
};

// POST /api/services (création de service avec image)
router.post('/', authenticate, uploadServiceImages, async (req, res) => {
  try {
    const { name, description, price, duration, category, depositPercentage, imageUrl: imageUrlBody, media } = req.body;
    const userId = req.user.id;
    // Trouver le salon du user connecté
    const salon = await prisma.salon.findFirst({ where: { ownerId: userId } });
    if (!salon) return res.status(400).json({ error: 'Salon introuvable' });
    const imageUrls = collectServiceImages(req);
    const imageUrl = imageUrls[0] || imageUrlBody || media || null;
    const service = await prisma.service.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        duration: parseInt(duration, 10),
        category,
        salonId: salon.id,
        imageUrl,
        images: imageUrls.length ? { create: imageUrls.map((url) => ({ url })) } : undefined,
        ...(depositPercentage !== undefined ? { depositPercentage: parseInt(depositPercentage, 10) } : {}),
      },
      include: { images: true },
    });
    res.status(201).json({ status: 'success', data: service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/services (récupérer tous les services)
router.get('/', authenticate, async (req, res) => {
  try {
    const { all } = req.query;
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      const services = await prisma.service.findMany({ include: { images: true } });
      return res.json(services);
    }
    const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
    if (!salon) return res.json([]);
    const services = await prisma.service.findMany({ where: { salonId: salon.id }, include: { images: true } });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/services/:id (supprimer un service)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const service = await prisma.service.findUnique({ where: { id }, include: { salon: true } });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      if (!service.salon || service.salon.ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    const deleted = await prisma.service.delete({ where: { id } });
    res.json({ status: 'success', data: deleted });
  } catch (err) {
    res.status(404).json({ error: 'Service not found' });
  }
});


// PATCH /api/services/:id (mise à jour d'un service avec image)
router.patch('/:id', authenticate, uploadServiceImages, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, duration, category, depositPercentage, imageUrl, media } = req.body;
    const service = await prisma.service.findUnique({ where: { id }, include: { salon: true } });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      if (!service.salon || service.salon.ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    let updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (duration !== undefined) updateData.duration = parseInt(duration, 10);
    if (category !== undefined) updateData.category = category;
    if (depositPercentage !== undefined) updateData.depositPercentage = parseInt(depositPercentage, 10);
    const imageUrls = collectServiceImages(req);
    if (imageUrls.length) {
      updateData.imageUrl = imageUrls[0];
      updateData.images = {
        deleteMany: {},
        create: imageUrls.map((url) => ({ url })),
      };
    } else if (imageUrl || media) {
      updateData.imageUrl = imageUrl || media;
    }
    const updated = await prisma.service.update({
      where: { id },
      data: updateData,
      include: { images: true },
    });
    res.json({ status: 'success', data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
