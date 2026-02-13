
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET: Liste des notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ ok: true, data: notifications });
  } catch (e) {
    res.status(500).json({ ok: false, error: { message: e.message || 'Erreur serveur' } });
  }
});

// POST: Créer une notification
router.post('/', async (req, res) => {
  try {
    const notification = await prisma.notification.create({ data: req.body });
    res.json({ ok: true, data: notification });
  } catch (e) {
    res.status(500).json({ ok: false, error: { message: e.message || 'Erreur serveur' } });
  }
});

// PATCH: Modifier une notification
router.patch('/', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    const notification = await prisma.notification.update({ where: { id }, data });
    res.json({ ok: true, data: notification });
  } catch (e) {
    res.status(500).json({ ok: false, error: { message: e.message || 'Erreur serveur' } });
  }
});

// DELETE: Supprimer une notification
router.delete('/', async (req, res) => {
  try {
    const { id } = req.body;
    await prisma.notification.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: { message: e.message || 'Erreur serveur' } });
  }
});

module.exports = router;
