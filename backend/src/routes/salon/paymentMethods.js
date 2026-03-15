const express = require('express');
const router = express.Router();
const { authenticate, requireApprovedPro } = require('../../middleware/auth');
const paymentMethodController = require('../../controllers/salonPaymentMethodController');
const { uploadPaymentQr } = require('../../config/cloudinary');

// Get all payment methods for a salon
router.get('/', authenticate, requireApprovedPro, paymentMethodController.getAll);

// Add a new payment method
router.post('/', authenticate, requireApprovedPro, paymentMethodController.create);

// Upload QR image
router.post(
  '/upload-qr',
  authenticate,
  requireApprovedPro,
  uploadPaymentQr.single('image'),
  paymentMethodController.uploadQr
);

// Delete a payment method
router.delete('/:id', authenticate, requireApprovedPro, paymentMethodController.delete);

// Update a payment method
router.patch('/:id', authenticate, requireApprovedPro, paymentMethodController.update);

module.exports = router;
