const express = require('express');
const router = express.Router();
const { authenticate, requireApprovedPro } = require('../../middleware/auth');
const paymentMethodController = require('../../controllers/salonPaymentMethodController');

// Get all payment methods for a salon


// Get all payment methods for a salon
router.get('/', authenticate, requireApprovedPro, paymentMethodController.getAll);

// Add a new payment method
router.post('/', authenticate, requireApprovedPro, paymentMethodController.create);

// Update a payment method (enable/disable)

// Delete a payment method
router.delete('/:id', authenticate, requireApprovedPro, paymentMethodController.delete);

router.patch('/:id', authenticate, requireApprovedPro, paymentMethodController.update);

module.exports = router;
