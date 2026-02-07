const express = require('express');
const router = express.Router();
const { requireApprovedPro } = require('../../middleware/auth');
const paymentMethodController = require('../../controllers/salonPaymentMethodController');

// Get all payment methods for a salon

// Get all payment methods for a salon
router.get('/', requireApprovedPro, paymentMethodController.getAll);

// Add a new payment method
router.post('/', requireApprovedPro, paymentMethodController.create);

// Update a payment method (enable/disable)
router.patch('/:id', requireApprovedPro, paymentMethodController.update);

module.exports = router;
