import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET: Récupérer les paramètres du salon
export async function GET(req, res) {
  try {
    const { salonId } = req.query;
    const settings = await prisma.salonSettings.findUnique({ where: { salonId } });
    res.json({ ok: true, data: settings });
  } catch (e) {
    res.status(500).json({ ok: false, error: { message: e.message || 'Erreur serveur' } });
  }
}

// POST: Créer les paramètres du salon
export async function POST(req, res) {
  try {
    const { salonId, preferences } = req.body;
    const settings = await prisma.salonSettings.create({ data: { salonId, preferences } });
    res.json({ ok: true, data: settings });
  } catch (e) {
    res.status(500).json({ ok: false, error: { message: e.message || 'Erreur serveur' } });
  }
}

// PATCH: Modifier les paramètres du salon
export async function PATCH(req, res) {
  try {
    const { salonId, preferences } = req.body;
    const settings = await prisma.salonSettings.update({ where: { salonId }, data: { preferences } });
    res.json({ ok: true, data: settings });
  } catch (e) {
    res.status(500).json({ ok: false, error: { message: e.message || 'Erreur serveur' } });
  }
}

// DELETE: Supprimer les paramètres du salon
export async function DELETE(req, res) {
  try {
    const { salonId } = req.body;
    await prisma.salonSettings.delete({ where: { salonId } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: { message: e.message || 'Erreur serveur' } });
  }
}
