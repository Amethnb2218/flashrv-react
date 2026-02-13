
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, requireApprovedPro } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadsSubdir } = require('../utils/paths');

const galleryDir = uploadsSubdir('gallery');
if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });
const galleryStorage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, galleryDir),
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname);
		const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
		cb(null, name);
	},
});
const uploadGallery = multer({ storage: galleryStorage });

// Suppression d'un membre de l'équipe
router.delete('/team/:id', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { id } = req.params;
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
		const member = await prisma.staffMember.findUnique({ where: { id } });
		if (!member || member.salonId !== salon.id) return res.status(404).json({ ok: false, error: 'Membre introuvable' });
		await prisma.staffMember.delete({ where: { id } });
		res.json({ ok: true });
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});

// Données réelles depuis Prisma
router.get('/team', authenticate, requireApprovedPro, async (req, res) => {
	const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
	if (!salon) return res.json({ data: [] });
	const team = await prisma.staffMember.findMany({ where: { salonId: salon.id } });
	res.json({ data: team });
});

// Ajout d'un membre à l'équipe
router.post('/team', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { name, role, email, phone } = req.body;
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
		// Adapter les champs selon le modèle staffMember
		const newMember = await prisma.staffMember.create({
			data: {
				name,
				role,
				email,
				phone,
				salonId: salon.id,
			}
		});
		res.status(201).json({ ok: true, data: newMember });
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});
// Mise à jour d'un membre
router.patch('/team/:id', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { id } = req.params;
		const { name, role, email, phone, isActive } = req.body || {};
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
		const member = await prisma.staffMember.findUnique({ where: { id } });
		if (!member || member.salonId !== salon.id) return res.status(404).json({ ok: false, error: 'Membre introuvable' });
		const updated = await prisma.staffMember.update({
			where: { id },
			data: {
				...(name !== undefined ? { name } : {}),
				...(role !== undefined ? { role } : {}),
				...(email !== undefined ? { email } : {}),
				...(phone !== undefined ? { phone } : {}),
				...(isActive !== undefined ? { isActive: !!isActive } : {}),
			},
		});
		res.json({ ok: true, data: updated });
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});
router.get('/services', authenticate, requireApprovedPro, async (req, res) => {
	const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
	if (!salon) return res.json([]);
	const services = await prisma.service.findMany({
		where: { salonId: salon.id },
		include: { images: true },
	});
	res.json(services);
});
router.get('/clients', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.json([]);
		const clients = await prisma.user.findMany({
			where: {
				role: 'CLIENT',
				appointments: { some: { salonId: salon.id } }
			},
			select: {
				id: true,
				name: true,
				username: true,
				email: true,
				phoneNumber: true,
				address: true,
				noShowCount: true,
				notes: true,
				preferences: true
			}
		});
		const mapped = clients.map(c => ({
			id: c.id,
			name: c.name || c.username || 'Client',
			phone: c.phoneNumber || '',
			email: c.email || '',
			address: c.address || '',
			noShowCount: c.noShowCount || 0,
			notes: c.notes || '',
			preferences: c.preferences || '',
		}));
		res.json(mapped);
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});
router.patch('/clients/:id', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { id } = req.params;
		const { address, notes, preferences, noShowCount } = req.body || {};
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
		const hasLink = await prisma.appointment.findFirst({
			where: { salonId: salon.id, clientId: id }
		});
		if (!hasLink) return res.status(403).json({ ok: false, error: 'Client non lié à ce salon' });
		const updated = await prisma.user.update({
			where: { id },
			data: {
				...(address !== undefined ? { address: String(address || '').trim() } : {}),
				...(notes !== undefined ? { notes: String(notes || '') } : {}),
				...(preferences !== undefined ? { preferences: String(preferences || '') } : {}),
				...(noShowCount !== undefined ? { noShowCount: Number(noShowCount) || 0 } : {}),
			},
			select: {
				id: true,
				name: true,
				username: true,
				email: true,
				phoneNumber: true,
				address: true,
				noShowCount: true,
				notes: true,
				preferences: true
			}
		});
		res.json(updated);
	} catch (error) {
		if (error.code === 'P2025') {
			res.status(404).json({ ok: false, error: 'Client introuvable' });
		} else {
			res.status(400).json({ ok: false, error: error.message });
		}
	}
});
router.get('/portfolio', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.json([]);
		const gallery = await prisma.galleryImage.findMany({
			where: { salonId: salon.id },
			orderBy: { createdAt: 'desc' },
		});
		res.json(gallery);
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});
router.post('/portfolio', authenticate, requireApprovedPro, uploadGallery.single('image'), async (req, res) => {
	try {
		const { url, caption, category } = req.body || {};
		const fileUrl = req.file ? `/uploads/gallery/${req.file.filename}` : null;
		const mediaUrl = fileUrl || url;
		if (!mediaUrl) return res.status(400).json({ ok: false, error: 'URL requise' });
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(400).json({ ok: false, error: 'Salon introuvable' });
		const created = await prisma.galleryImage.create({
			data: {
				url: mediaUrl,
				caption: caption || null,
				category: category || null,
				salonId: salon.id,
			},
		});
		res.status(201).json({ ok: true, data: created });
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});
router.delete('/portfolio/:id', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { id } = req.params;
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(400).json({ ok: false, error: 'Salon introuvable' });
		const item = await prisma.galleryImage.findUnique({ where: { id } });
		if (!item || item.salonId !== salon.id) return res.status(404).json({ ok: false, error: 'Item introuvable' });
		await prisma.galleryImage.delete({ where: { id } });
		res.json({ ok: true });
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});
router.get('/promos', authenticate, requireApprovedPro, async (req, res) => {
	const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
	if (!salon) return res.json([]);
	const promos = await prisma.promoCode.findMany({ where: { salonId: salon.id } });
	res.json(promos);
});
router.post('/promos', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { code, type, discount, value, isActive, active, validTo, expiresAt } = req.body || {};
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
		const cleanCode = String(code || '').trim().toUpperCase();
		const amount = Number(discount ?? value ?? 0);
		if (!cleanCode) return res.status(400).json({ ok: false, error: 'Code requis' });
		const newPromo = await prisma.promoCode.create({
			data: {
				code: cleanCode,
				type: type || 'percent',
				discount: amount,
				isActive: !!(isActive ?? active),
				validTo: validTo ? new Date(validTo) : (expiresAt ? new Date(expiresAt) : null),
				salonId: salon.id,
			},
		});
		res.status(201).json(newPromo);
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});
router.patch('/promos/:id', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { id } = req.params;
		const { isActive, active, validTo, expiresAt } = req.body || {};
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
		const promo = await prisma.promoCode.findUnique({ where: { id } });
		if (!promo || promo.salonId !== salon.id) return res.status(404).json({ ok: false, error: 'Promo introuvable' });
		const data = {};
		if (isActive !== undefined || active !== undefined) data.isActive = !!(isActive ?? active);
		if (validTo !== undefined || expiresAt !== undefined) {
			data.validTo = validTo ? new Date(validTo) : (expiresAt ? new Date(expiresAt) : null);
		}
		const updated = await prisma.promoCode.update({ where: { id }, data });
		res.json(updated);
	} catch (error) {
		if (error.code === 'P2025') {
			res.status(404).json({ ok: false, error: 'Promo introuvable' });
		} else {
			res.status(400).json({ ok: false, error: error.message });
		}
	}
});
router.delete('/promos/:id', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { id } = req.params;
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
		const promo = await prisma.promoCode.findUnique({ where: { id } });
		if (!promo || promo.salonId !== salon.id) return res.status(404).json({ ok: false, error: 'Promo introuvable' });
		await prisma.promoCode.delete({ where: { id } });
		res.json({ ok: true });
	} catch (error) {
		if (error.code === 'P2025') {
			res.json({ ok: true, alreadyDeleted: true });
		} else {
			res.status(400).json({ ok: false, error: error.message });
		}
	}
});
router.get('/reviews', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.json([]);
		const reviews = await prisma.review.findMany({
			where: { salonId: salon.id },
			orderBy: { createdAt: 'desc' },
			include: { user: { select: { name: true, username: true, email: true, picture: true } } },
		});
		const mapped = reviews.map((r) => ({
			...r,
			clientName: r.user?.name || r.user?.username || r.user?.email || 'Client',
		}));
		res.json(mapped);
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});
router.patch('/reviews/:id', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { id } = req.params;
		const { status } = req.body || {};
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(400).json({ ok: false, error: 'Salon introuvable' });
		const review = await prisma.review.findUnique({ where: { id } });
		if (!review || review.salonId !== salon.id) return res.status(404).json({ ok: false, error: 'Avis introuvable' });
		const updated = await prisma.review.update({
			where: { id },
			data: { status: String(status || '').toLowerCase() || 'approved' },
		});
		res.json(updated);
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});

// STATS (salon owner only)
router.get('/stats', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { period = 'month' } = req.query;
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) {
			return res.json({ data: { totalRevenue: 0, totalBookings: 0, averageTicket: 0, cancelledBookings: 0, completedBookings: 0, topServices: [] } });
		}

		const now = new Date();
		const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
		const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
		let start = startOfDay(now);
		let end = endOfDay(now);

		if (period === 'week') {
			const day = now.getDay(); // 0=Sun
			const diff = day === 0 ? 6 : day - 1; // Monday start
			start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff));
			end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
		} else if (period === 'month') {
			start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
			end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
		} else if (period === 'year') {
			start = startOfDay(new Date(now.getFullYear(), 0, 1));
			end = endOfDay(new Date(now.getFullYear(), 11, 31));
		}

		const appointments = await prisma.appointment.findMany({
			where: {
				salonId: salon.id,
				date: { gte: start, lte: end },
			},
			include: {
				service: { select: { name: true } },
			},
		});

		const totalBookings = appointments.length;
		const completed = appointments.filter((a) => a.status === 'COMPLETED');
		const cancelled = appointments.filter((a) => a.status === 'CANCELLED');
		const totalRevenue = completed.reduce((sum, a) => sum + (a.totalPrice || 0), 0);
		const averageTicket = completed.length ? Math.round(totalRevenue / completed.length) : 0;

		const countsByService = new Map();
		for (const a of appointments) {
			const name = a.service?.name || 'Service';
			countsByService.set(name, (countsByService.get(name) || 0) + 1);
		}
		const topServices = Array.from(countsByService.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5);

		res.json({
			data: {
				totalRevenue,
				totalBookings,
				averageTicket,
				cancelledBookings: cancelled.length,
				completedBookings: completed.length,
				topServices,
			},
		});
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});
// PLANNING BREAKS
router.get('/planning/breaks', authenticate, requireApprovedPro, async (req, res) => {
	const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
	if (!salon) return res.json([]);
	const breaks = await prisma.planningBreak.findMany({ where: { salonId: salon.id } });
	res.json(breaks);
});
router.post('/planning/breaks', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { date, start, end, label } = req.body;
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
		const startValue = date && start ? new Date(`${date}T${start}`) : new Date(start);
		const endValue = date && end ? new Date(`${date}T${end}`) : new Date(end);
		const newBreak = await prisma.planningBreak.create({
			data: {
				start: startValue,
				end: endValue,
				label: label || "Pause",
				salonId: salon.id,
			}
		});
		res.status(201).json({ ok: true, data: newBreak });
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});
router.delete('/planning/breaks/:id', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { id } = req.params;
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
		const item = await prisma.planningBreak.findUnique({ where: { id } });
		if (!item || item.salonId !== salon.id) return res.status(404).json({ ok: false, error: 'Pause introuvable' });
		await prisma.planningBreak.delete({ where: { id } });
		res.json({ ok: true });
	} catch (error) {
		if (error.code === 'P2025') {
			res.json({ ok: true, alreadyDeleted: true });
		} else {
			res.status(400).json({ ok: false, error: error.message });
		}
	}
});

// PLANNING EXCEPTIONS
router.get('/planning/exceptions', authenticate, requireApprovedPro, async (req, res) => {
	const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
	if (!salon) return res.json([]);
	const exceptions = await prisma.planningException.findMany({ where: { salonId: salon.id } });
	res.json(exceptions);
});
router.post('/planning/exceptions', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { date, open, close, closed } = req.body;
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
		const reason = closed ? "closed" : (open && close ? `open:${open};close:${close}` : "");
		const newException = await prisma.planningException.create({
			data: {
				date: new Date(date),
				reason,
				salonId: salon.id,
			}
		});
		res.status(201).json({ ok: true, data: newException });
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});
router.delete('/planning/exceptions/:id', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { id } = req.params;
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
		const item = await prisma.planningException.findUnique({ where: { id } });
		if (!item || item.salonId !== salon.id) return res.status(404).json({ ok: false, error: 'Exception introuvable' });
		await prisma.planningException.delete({ where: { id } });
		res.json({ ok: true });
	} catch (error) {
		if (error.code === 'P2025') {
			res.json({ ok: true, alreadyDeleted: true });
		} else {
			res.status(400).json({ ok: false, error: error.message });
		}
	}
});

// PLANNING HOLIDAYS
router.get('/planning/holidays', authenticate, requireApprovedPro, async (req, res) => {
	const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
	if (!salon) return res.json([]);
	const holidays = await prisma.planningHoliday.findMany({ where: { salonId: salon.id } });
	res.json(holidays);
});
router.post('/planning/holidays', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { date, label, name } = req.body;
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
		const newHoliday = await prisma.planningHoliday.create({
			data: {
				date: new Date(date),
				label: name || label || "Jour ferie",
				salonId: salon.id,
			}
		});
		res.status(201).json({ ok: true, data: newHoliday });
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});
router.delete('/planning/holidays/:id', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { id } = req.params;
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
		const item = await prisma.planningHoliday.findUnique({ where: { id } });
		if (!item || item.salonId !== salon.id) return res.status(404).json({ ok: false, error: 'Jour ferie introuvable' });
		await prisma.planningHoliday.delete({ where: { id } });
		res.json({ ok: true });
	} catch (error) {
		if (error.code === 'P2025') {
			res.json({ ok: true, alreadyDeleted: true });
		} else {
			res.status(400).json({ ok: false, error: error.message });
		}
	}
});
router.get('/loyalty', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.json({ settings: null, data: [] });
		const settingsRow = await prisma.salonSettings.findUnique({ where: { salonId: salon.id } });
		let prefs = {};
		if (settingsRow?.preferences) {
			try { prefs = JSON.parse(settingsRow.preferences); } catch (e) { prefs = {}; }
		}
		const loyaltySettings = prefs.loyalty || null;
		const clientIds = await prisma.appointment.findMany({
			where: { salonId: salon.id },
			select: { clientId: true },
		});
		const ids = Array.from(new Set(clientIds.map((c) => c.clientId))).filter(Boolean);
		const loyalty = ids.length
			? await prisma.loyalty.findMany({
			where: { salonId: salon.id, clientId: { in: ids } },
			include: { client: { select: { name: true, email: true, phoneNumber: true } } },
		})
		: [];
		res.json({ settings: loyaltySettings, data: loyalty });
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});
router.patch('/loyalty', authenticate, requireApprovedPro, async (req, res) => {
	try {
		const { settings } = req.body || {};
		const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
		if (!salon) return res.status(400).json({ ok: false, error: 'Salon introuvable' });
		const existing = await prisma.salonSettings.findUnique({ where: { salonId: salon.id } });
		let prefs = {};
		if (existing?.preferences) {
			try { prefs = JSON.parse(existing.preferences); } catch (e) { prefs = {}; }
		}
		prefs.loyalty = settings || null;
		await prisma.salonSettings.upsert({
			where: { salonId: salon.id },
			update: { preferences: JSON.stringify(prefs) },
			create: { salonId: salon.id, preferences: JSON.stringify(prefs) },
		});
		res.json({ ok: true, settings: prefs.loyalty || null });
	} catch (error) {
		res.status(400).json({ ok: false, error: error.message });
	}
});

module.exports = router;
