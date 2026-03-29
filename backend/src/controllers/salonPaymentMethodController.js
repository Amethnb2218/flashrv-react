const prisma = require('../lib/prisma');

const ALLOWED_METHODS = new Set([
  'WAVE',
  'ORANGE_MONEY',
  'FREE_MONEY',
  'CARD',
  'CASH',
  'PAY_ON_SITE',
  'PAY_ON_PICKUP',
  'CASH_ON_DELIVERY',
]);

const MOBILE_MONEY_METHODS = new Set(['WAVE', 'ORANGE_MONEY', 'FREE_MONEY']);

const cleanString = (value, max = 200) => {
  if (value == null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.slice(0, max);
};

const normalizeMethod = (value) => cleanString(value, 40)?.toUpperCase() || null;

const parseBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const getOwnerSalon = async (userId) => {
  return prisma.salon.findUnique({ where: { ownerId: userId } });
};

const sanitizeMethodPayload = ({ body, existingMethod = null }) => {
  const hasMethod = Object.prototype.hasOwnProperty.call(body || {}, 'method');
  const hasEnabled = Object.prototype.hasOwnProperty.call(body || {}, 'enabled');
  const hasDisplayName = Object.prototype.hasOwnProperty.call(body || {}, 'displayName');
  const hasPhoneNumber = Object.prototype.hasOwnProperty.call(body || {}, 'phoneNumber');
  const hasQrCodeUrl = Object.prototype.hasOwnProperty.call(body || {}, 'qrCodeUrl');
  const hasInstructions = Object.prototype.hasOwnProperty.call(body || {}, 'instructions');
  const hasRequiresProof = Object.prototype.hasOwnProperty.call(body || {}, 'requiresProof');

  const nextMethod = hasMethod
    ? normalizeMethod(body.method)
    : normalizeMethod(existingMethod?.method);

  if (!nextMethod || !ALLOWED_METHODS.has(nextMethod)) {
    const err = new Error('Moyen de paiement invalide.');
    err.statusCode = 400;
    throw err;
  }

  const defaultRequiresProof = MOBILE_MONEY_METHODS.has(nextMethod);

  const enabled = hasEnabled
    ? parseBoolean(body.enabled)
    : (existingMethod ? !!existingMethod.enabled : true);

  const displayName = hasDisplayName
    ? cleanString(body.displayName, 120)
    : existingMethod?.displayName ?? null;

  const phoneNumber = hasPhoneNumber
    ? cleanString(body.phoneNumber, 40)
    : existingMethod?.phoneNumber ?? null;

  const qrCodeUrl = hasQrCodeUrl
    ? cleanString(body.qrCodeUrl, 500)
    : existingMethod?.qrCodeUrl ?? null;

  const instructions = hasInstructions
    ? cleanString(body.instructions, 400)
    : existingMethod?.instructions ?? null;

  const requiresProof = hasRequiresProof
    ? parseBoolean(body.requiresProof, defaultRequiresProof)
    : (existingMethod ? !!existingMethod.requiresProof : defaultRequiresProof);

  if (enabled && MOBILE_MONEY_METHODS.has(nextMethod) && !phoneNumber && !qrCodeUrl) {
    const err = new Error('Ajoutez un numero marchand ou un QR code pour ce moyen de paiement.');
    err.statusCode = 400;
    throw err;
  }

  return {
    method: nextMethod,
    enabled,
    displayName,
    phoneNumber,
    qrCodeUrl,
    instructions,
    requiresProof,
  };
};

// GET all payment methods for the current PRO salon
exports.getAll = async (req, res) => {
  try {
    const salon = await getOwnerSalon(req.user.id);
    if (!salon) return res.status(404).json({ error: 'Salon not found' });
    const methods = await prisma.salonPaymentMethod.findMany({
      where: { salonId: salon.id },
      orderBy: [{ enabled: 'desc' }, { updatedAt: 'desc' }],
    });
    res.json(methods);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// POST add a new payment method
exports.create = async (req, res) => {
  try {
    const salon = await getOwnerSalon(req.user.id);
    if (!salon) return res.status(404).json({ error: 'Salon not found' });

    const payload = sanitizeMethodPayload({ body: req.body });
    const created = await prisma.salonPaymentMethod.create({
      data: { salonId: salon.id, ...payload },
    });
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ce moyen de paiement existe deja.' });
    }
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

// PATCH update a payment method (fields + enable/disable)
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const salon = await getOwnerSalon(req.user.id);
    if (!salon) return res.status(404).json({ error: 'Salon not found' });

    const method = await prisma.salonPaymentMethod.findUnique({ where: { id } });
    if (!method || method.salonId !== salon.id) {
      return res.status(404).json({ error: 'Methode non trouvee' });
    }

    const payload = sanitizeMethodPayload({ body: req.body, existingMethod: method });
    const updated = await prisma.salonPaymentMethod.update({
      where: { id },
      data: payload,
    });
    res.json(updated);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

// DELETE a payment method
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const salon = await getOwnerSalon(req.user.id);
    if (!salon) return res.status(404).json({ error: 'Salon not found' });

    const method = await prisma.salonPaymentMethod.findUnique({ where: { id } });
    if (!method || method.salonId !== salon.id) {
      return res.status(404).json({ error: 'Methode non trouvee' });
    }

    await prisma.salonPaymentMethod.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// POST upload QR image for payment method setup
exports.uploadQr = async (req, res) => {
  try {
    const salon = await getOwnerSalon(req.user.id);
    if (!salon) return res.status(404).json({ error: 'Salon not found' });
    if (!req.file) return res.status(400).json({ error: 'Image QR requise.' });
    const url = req.file.path || req.file.secure_url || req.file.url || null;
    if (!url) return res.status(500).json({ error: 'Upload QR invalide.' });
    res.status(201).json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
