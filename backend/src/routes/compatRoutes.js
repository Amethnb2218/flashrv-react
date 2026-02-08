const express = require('express');
const router = express.Router();


const prisma = require('../lib/prisma');

// Données réelles depuis Prisma
router.get('/team', async (req, res) => {
	const team = await prisma.staffMember.findMany();
	res.json(team);
});
router.get('/services', async (req, res) => {
	const services = await prisma.service.findMany();
	res.json(services);
});
router.get('/clients', async (req, res) => {
	const clients = await prisma.user.findMany({ where: { role: 'CLIENT' } });
	res.json(clients);
});
router.get('/portfolio', async (req, res) => {
	const gallery = await prisma.galleryImage.findMany();
	res.json(gallery);
});
router.get('/promos', async (req, res) => {
	const promos = await prisma.promoCode.findMany();
	res.json(promos);
});
router.get('/reviews', async (req, res) => {
	const reviews = await prisma.review.findMany();
	res.json(reviews);
});
router.get('/planning/breaks', async (req, res) => {
	const breaks = await prisma.planningBreak.findMany();
	res.json(breaks);
});
router.get('/planning/exceptions', async (req, res) => {
	const exceptions = await prisma.planningException.findMany();
	res.json(exceptions);
});
router.get('/planning/holidays', async (req, res) => {
	const holidays = await prisma.planningHoliday.findMany();
	res.json(holidays);
});
router.get('/loyalty', async (req, res) => {
	const loyalty = await prisma.loyalty.findMany();
	res.json(loyalty);
});

module.exports = router;
