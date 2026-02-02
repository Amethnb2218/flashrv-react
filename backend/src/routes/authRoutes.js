const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/google', authController.googleAuth);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);
router.patch('/profile', authenticate, authController.updateProfile);
router.delete('/account', authenticate, authController.deleteAccount);

module.exports = router;
