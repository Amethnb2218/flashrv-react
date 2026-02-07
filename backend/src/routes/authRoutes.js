const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

/* ===========================================
   PUBLIC ROUTES (pas d'authentification requise)
   =========================================== */

/**
 * @route   POST /api/auth/google
 * @desc    Authentification avec Google OAuth
 * @access  Public
 * @body    { token: string } - Token ID de Google
 */
router.post("/google", authController.googleAuth);

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion de l'utilisateur
 * @access  Public
 */
router.post("/logout", authController.logout);

/* ===========================================
   PROTECTED ROUTES (authentification requise)
   =========================================== */

/**
 * @route   GET /api/auth/me
 * @desc    Récupérer les informations de l'utilisateur connecté
 * @access  Private
 */
router.get("/me", authenticate, authController.getCurrentUser);

/**
 * @route   PATCH /api/auth/profile
 * @desc    Mettre à jour le profil de l'utilisateur
 * @access  Private
 * @body    { name?: string, email?: string, phone?: string, avatar?: string }
 */
router.patch("/profile", authenticate, authController.updateProfile);

/**
 * @route   DELETE /api/auth/account
 * @desc    Supprimer le compte utilisateur
 * @access  Private
 */
router.delete("/account", authenticate, authController.deleteAccount);

module.exports = router;