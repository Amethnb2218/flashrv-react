const express = require("express");
const rateLimit = require('express-rate-limit');
const router = express.Router();

const authController = require("../controllers/authController");
const { authenticate, optionalAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleAuthSchema,
  updateProfileSchema,
} = require("../schemas/auth");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Trop de créations de comptes. Réessayez plus tard.' },
});

const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Trop de tentatives Google. Réessayez dans quelques minutes.' },
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Trop de demandes de reinitialisation. Reessayez dans quelques minutes.' },
});

/* ===========================================
   PUBLIC ROUTES (pas d'authentification requise)
   =========================================== */

/**
 * @route   POST /api/auth/google
 * @desc    Authentification avec Google OAuth
 * @access  Public
 * @body    { token: string } - Token ID de Google
 */
router.post("/google", googleAuthLimiter, validate(googleAuthSchema), authController.googleAuth);

/**
 * @route   POST /api/auth/register
 * @desc    Inscription classique (email/password)
 * @access  Public
 */
router.post("/register", registerLimiter, validate(registerSchema), authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Connexion classique (email/password)
 * @access  Public
 */
router.post("/login", loginLimiter, validate(loginSchema), authController.login);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Demander un lien de reinitialisation de mot de passe
 * @access  Public
 */
router.post("/forgot-password", passwordResetLimiter, validate(forgotPasswordSchema), authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reinitialiser le mot de passe avec un token
 * @access  Public
 */
router.post("/reset-password", passwordResetLimiter, validate(resetPasswordSchema), authController.resetPassword);

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
 * @route   GET /api/auth/session
 * @desc    Retourne l'utilisateur courant si connecté, sinon user=null (sans 401)
 * @access  Public
 */
router.get("/session", optionalAuth, authController.getSession);

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
router.patch("/profile", authenticate, validate(updateProfileSchema), authController.updateProfile);

/**
 * @route   DELETE /api/auth/account
 * @desc    Supprimer le compte utilisateur
 * @access  Private
 */
router.delete("/account", authenticate, authController.deleteAccount);

module.exports = router;
