const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all payment methods for the current PRO's salon
exports.getAll = async (req, res) => {
  try {
    const salon = await prisma.salon.findUnique({
      where: { ownerId: req.user.id },
    });
    if (!salon) return res.status(404).json({ error: 'Salon not found' });
    const methods = await prisma.salonPaymentMethod.findMany({
      where: { salonId: salon.id },
    });
    res.json(methods);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
};

// POST add a new payment method
exports.create = async (req, res) => {
  try {
    const { method, enabled } = req.body;
    const salon = await prisma.salon.findUnique({ where: { ownerId: req.user.id } });
    if (!salon) return res.status(404).json({ error: 'Salon not found' });
    const created = await prisma.salonPaymentMethod.create({
      data: { salonId: salon.id, method, enabled: !!enabled },
    });
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Ce moyen de paiement existe déjà.' });
    } else {
      res.status(500).json({ error: 'Erreur serveur', details: err.message });
    }
  }
};

// PATCH update a payment method (enable/disable)
exports.update = async (req, res) => {
  try {
    const { enabled } = req.body;
    const { id } = req.params;
    const salon = await prisma.salon.findUnique({ where: { ownerId: req.user.id } });
    if (!salon) return res.status(404).json({ error: 'Salon not found' });
    const method = await prisma.salonPaymentMethod.findUnique({ where: { id } });
    if (!method || method.salonId !== salon.id) return res.status(404).json({ error: 'Méthode non trouvée' });
    const updated = await prisma.salonPaymentMethod.update({ where: { id }, data: { enabled: !!enabled } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
};
