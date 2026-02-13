import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET: Récupérer les paramètres utilisateur
export async function GET(req, res) {
  try {
    const { userId } = req.query;
    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    res.json({ ok: true, data: settings });
  } catch (e) {
    res.status(500).json({ ok: false, error: { message: e.message || 'Erreur serveur' } });
  }
}

// POST: Créer les paramètres utilisateur
export async function POST(req, res) {
  try {
    const { userId, preferences } = req.body;
    const settings = await prisma.userSettings.create({ data: { userId, preferences } });
    res.json({ ok: true, data: settings });
  } catch (e) {
    res.status(500).json({ ok: false, error: { message: e.message || 'Erreur serveur' } });
  }
}

// PATCH: Modifier les paramètres utilisateur
export async function PATCH(req, res) {
  try {
    const { userId, preferences } = req.body;
    const settings = await prisma.userSettings.update({ where: { userId }, data: { preferences } });
    res.json({ ok: true, data: settings });
  } catch (e) {
    res.status(500).json({ ok: false, error: { message: e.message || 'Erreur serveur' } });
  }
}

// DELETE: Supprimer les paramètres utilisateur
export async function DELETE(req, res) {
  try {
    const { userId } = req.body;
    await prisma.userSettings.delete({ where: { userId } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: { message: e.message || 'Erreur serveur' } });
  }
}
