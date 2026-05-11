/**
 * Register with email/password
 * POST /api/auth/register
 * Body: { name, email, phone, password, role }
 */
async function register(req, res, next) {
  try {
    const { name, email, phone, password, role, googleSub } = req.body || {};
    if (!name || !email || !password || !role) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }
    if (password.length < 8) {
      return res.status(400).json({ status: 'error', message: 'Le mot de passe doit contenir au moins 8 caractères' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        status: 'error',
        message: 'Le mot de passe doit contenir majuscule, minuscule et chiffre',
      });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!isValidEmailAddress(normalizedEmail)) {
      return res.status(400).json({ status: 'error', message: 'Adresse email invalide.' });
    }
    // Vérifier unicité email
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Email déjà utilisé' });
    }
    // Statut selon rôle — seuls CLIENT et PRO sont autorisés à l'inscription
    const allowedRoles = ['CLIENT', 'PRO'];
    const normalizedRole = role.toUpperCase();
    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({ status: 'error', message: 'Rôle invalide' });
    }
    const userStatus = normalizedRole === 'PRO' ? STATUS.PENDING : STATUS.APPROVED;
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);
    const userData = {
      name: String(name).trim(),
      email: normalizedEmail,
      phoneNumber: phone,
      role: normalizedRole,
      status: userStatus,
      googleSub: googleSub || null,
      password: hashedPassword,
    };
    const user = await prisma.user.create({
      data: userData,
    });
    if (normalizedRole === 'PRO') {
      sendProPendingNotification({ proName: user.name, proEmail: user.email });
    } else {
      sendWelcomeEmail({ to: user.email, name: user.name });
    }
    // Générer un token (mock, à sécuriser en prod)
    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    const csrfToken = buildCsrfToken(token);
    setTokenCookie(res, token);
    const { password: _pw, ...safeUser } = user;
    return res.status(201).json({
      status: 'success',
      message: 'Votre compte a ete cree avec succes.',
      data: { user: safeUser, csrfToken },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Login with email/password
 * POST /api/auth/login
 * Body: { identifier, password }
 */
async function login(req, res, next) {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ status: 'error', message: 'Email et mot de passe requis' });
    }
    const normalizedIdentifier = String(identifier).trim().toLowerCase();
    if (isLoginLocked(normalizedIdentifier)) {
      return res.status(429).json({
        status: 'error',
        message: 'Compte temporairement bloqué. Réessayez dans quelques minutes.',
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedIdentifier },
          { username: normalizedIdentifier },
          { phoneNumber: String(identifier).trim() },
        ],
      },
    });
    if (!user || !user.password) {
      registerFailedLogin(normalizedIdentifier);
      return res.status(401).json({ status: 'error', message: 'Identifiants incorrects' });
    }
    const valid = await verifyPasswordWithLegacyMigration(user, password);
    if (!valid) {
      registerFailedLogin(normalizedIdentifier);
      return res.status(401).json({ status: 'error', message: 'Identifiants incorrects' });
    }
    clearLoginFailures(normalizedIdentifier);
    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    const csrfToken = buildCsrfToken(token);
    setTokenCookie(res, token);
    const { password: _pw, ...safeUser } = user;
    return res.json({
      status: 'success',
      message: 'Connexion etablie avec succes.',
      data: { user: safeUser, csrfToken },
    });
  } catch (error) {
    // Prisma network/runtime errors should not surface as generic 500 auth failures.
    if (typeof error?.code === 'string' && /^P\d{4}$/.test(error.code)) {
      error.statusCode = 503;
      error.expose = true;
      error.message = 'Service de connexion temporairement indisponible. Reessayez dans un instant.';
    }
    return next(error);
  }
}
const prisma = require("../lib/prisma");
const jwt = require("jsonwebtoken");
const { verifyGoogleToken } = require("../services/googleAuth");
const { generateToken, setTokenCookie, clearTokenCookie } = require("../utils/jwt");
const { buildCsrfToken } = require("../utils/csrf");
const { resolvePublicBaseUrl } = require("../utils/publicUrl");
const { ROLES, STATUS } = require("../middleware/auth");
const { sendWelcomeEmail, sendProPendingNotification, sendPasswordResetEmail } = require("../services/emailService");

const LOGIN_LOCK_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const PASSWORD_RESET_EXPIRES_IN = process.env.PASSWORD_RESET_EXPIRES_IN || '30m';
const failedLoginMap = new Map();

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(String(password || ''));
}

function isLoginLocked(identifier) {
  const item = failedLoginMap.get(identifier);
  if (!item) return false;
  const elapsed = Date.now() - item.firstFailureAt;
  if (elapsed > LOGIN_LOCK_WINDOW_MS) {
    failedLoginMap.delete(identifier);
    return false;
  }
  return item.failures >= LOGIN_MAX_FAILURES;
}

function registerFailedLogin(identifier) {
  const current = failedLoginMap.get(identifier);
  if (!current) {
    failedLoginMap.set(identifier, { failures: 1, firstFailureAt: Date.now() });
    return;
  }
  const elapsed = Date.now() - current.firstFailureAt;
  if (elapsed > LOGIN_LOCK_WINDOW_MS) {
    failedLoginMap.set(identifier, { failures: 1, firstFailureAt: Date.now() });
    return;
  }
  failedLoginMap.set(identifier, { ...current, failures: current.failures + 1 });
}

function clearLoginFailures(identifier) {
  failedLoginMap.delete(identifier);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function getFrontendBaseUrl() {
  return (
    resolvePublicBaseUrl(
      process.env.FRONTEND_URL,
      process.env.BASE_URL,
      process.env.ALLOWED_ORIGINS
    ) || 'https://jolofera.com'
  );
}

function getPasswordResetSecret(user) {
  return `${process.env.JWT_SECRET}:${user.id}:${user.password}`;
}

function createPasswordResetToken(user) {
  return jwt.sign(
    { sub: user.id, purpose: 'password_reset' },
    getPasswordResetSecret(user),
    { algorithm: 'HS256', expiresIn: PASSWORD_RESET_EXPIRES_IN }
  );
}

function isBcryptHash(value) {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(String(value || ''));
}

async function verifyPasswordWithLegacyMigration(user, rawPassword) {
  const bcrypt = require('bcryptjs');
  const stored = String(user?.password || '');
  const plain = String(rawPassword || '');

  if (!stored || !plain) return false;

  if (!isBcryptHash(stored)) {
    return false;
  }

  try {
    return await bcrypt.compare(plain, stored);
  } catch (_) {
    return false;
  }
}

/**
 * Petit helper: force les bons headers CORS sur la réponse
 * (utile quand fetch() utilise credentials: "include")
 */
function setCorsHeaders(req, res) {
  // Supprimé : gestion CORS centralisée dans app.js
}

/**
 * Google OAuth login/register
 * POST /api/auth/google
 * Body: { credential, customName?, accountType?: "CLIENT" | "PRO" }
 */
async function googleAuth(req, res, next) {
  try {
    // Les headers CORS sont gérés globalement dans app.js

    const { credential, customName, accountType } = req.body || {};

    if (!credential) {
      return res.status(400).json({
        status: "error",
        message: "Le jeton Google est requis.",
      });
    }

    // Verify the Google token
    const googleUser = await verifyGoogleToken(credential);

    // ✅ rendre robuste selon ce que retourne verifyGoogleToken
    const googleSub = googleUser.googleSub || googleUser.sub;
    const email = String(googleUser.email || '').trim().toLowerCase();
    const googleName = googleUser.name || "";

    if (!googleSub || !email) {
      return res.status(401).json({
        status: "error",
        message: "Le jeton Google est invalide. Merci de reessayer.",
      });
    }

    // Use custom name if provided, otherwise use Google name
    const userName = String(customName || googleName || "").trim();

    // Determine role and status based on account type
    const role = accountType === "PRO" ? ROLES.PRO : ROLES.CLIENT;
    const status = role === ROLES.PRO ? STATUS.PENDING : STATUS.APPROVED;

    // Check if user exists by googleSub first, then by email
    let user = await prisma.user.findUnique({
      where: { googleSub: googleSub },
    });

    let isNewUser = false;
    let accountLinked = false;

    if (user) {
      // Update existing user - keep custom name if already set, use new custom name if provided
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: userName || user.name || googleName,
          email: email,
        },
      });
    } else {
      // No user with this googleSub — check if email already exists (manual account)
      const existingByEmail = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, role: true, status: true, password: true, googleSub: true, phoneNumber: true, username: true, picture: true },
      });

      if (existingByEmail) {
        if (existingByEmail.password && !existingByEmail.googleSub) {
          return res.status(409).json({
            status: 'error',
            message: 'Un compte existe deja avec cet email. Connectez-vous avec votre mot de passe pour lier Google.',
            code: 'ACCOUNT_EXISTS_LINK_REQUIRED',
          });
        }
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleSub: googleSub,
            name: existingByEmail.name || userName || googleName,
          },
        });
        accountLinked = true;
      } else {
        // Create new user
        isNewUser = true;
        const bcrypt = require('bcryptjs');
        const randomPassword = require('crypto').randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 12);
        user = await prisma.user.create({
          data: {
            email: email,
            googleSub: googleSub,
            name: userName || googleName || "Utilisateur",
            picture: null,
            role: role,
            status: status,
            password: hashedPassword,
          },
        });
        if (role === ROLES.PRO) {
          sendProPendingNotification({ proName: user.name, proEmail: user.email });
        } else {
          sendWelcomeEmail({ to: user.email, name: user.name });
        }
      }
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const csrfToken = buildCsrfToken(token);

    // Set token as httpOnly cookie
    setTokenCookie(res, token);

    // Return user info (without sensitive data) + token (comme /register)
    return res.status(200).json({
      status: "success",
      message: accountLinked
        ? "Votre compte a bien ete associe a Google."
        : isNewUser
        ? "Votre compte a ete cree avec succes."
        : "Connexion Google reussie.",
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          picture: user.picture,
          role: user.role,
          status: user.status,
          phoneNumber: user.phoneNumber,
        },
        csrfToken,
        isNewUser,
        accountLinked,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return next(error);
  }
}

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
async function getCurrentUser(req, res, next) {
  try {
    setCorsHeaders(req, res);

    return res.status(200).json({
      status: "success",
      data: {
        user: req.user,
        csrfToken: req.authToken ? buildCsrfToken(req.authToken) : null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get optional authenticated user (no 401 when logged out)
 * GET /api/auth/session
 */
async function getSession(req, res, next) {
  try {
    return res.status(200).json({
      status: "success",
      data: {
        user: req.user || null,
        csrfToken: req.authToken ? buildCsrfToken(req.authToken) : null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Logout - clears the JWT cookie
 * POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    setCorsHeaders(req, res);

    clearTokenCookie(res);

    return res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update user profile
 * PATCH /api/auth/profile
 */
async function updateProfile(req, res, next) {
  try {
    setCorsHeaders(req, res);

    const { username, phoneNumber, name } = req.body || {};
    const userId = req.user.id;

    if (username && (String(username).trim().length < 3 || String(username).trim().length > 30)) {
      return res.status(400).json({ status: 'error', message: 'Le nom d utilisateur doit contenir entre 3 et 30 caracteres.' });
    }
    if (phoneNumber && !/^\+?[0-9\s\-]{7,20}$/.test(String(phoneNumber).trim())) {
      return res.status(400).json({ status: 'error', message: 'Numero de telephone invalide.' });
    }
    if (name && (String(name).trim().length < 2 || String(name).trim().length > 60)) {
      return res.status(400).json({ status: 'error', message: 'Le nom doit contenir entre 2 et 60 caracteres.' });
    }

    // Validate username uniqueness if provided
    if (username) {
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          status: "error",
          message: "This username is already taken",
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username ? { username: String(username).trim() } : {}),
        ...(phoneNumber ? { phoneNumber: String(phoneNumber).trim() } : {}),
        ...(name ? { name: String(name).trim() } : {}),
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        picture: true,
        role: true,
        status: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete user account
 * DELETE /api/auth/account
 */
async function deleteAccount(req, res, next) {
  try {
    setCorsHeaders(req, res);

    const userId = req.user.id;

    await prisma.$transaction(async (tx) => {
      await tx.appointment.deleteMany({ where: { clientId: userId } });
      await tx.appointment.deleteMany({ where: { coiffeurId: userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    clearTokenCookie(res);

    return res.status(200).json({
      status: "success",
      message: "Account deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !isValidEmailAddress(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Adresse email invalide.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, password: true },
    });

    if (user?.password) {
      const token = createPasswordResetToken(user);
      const resetUrl = `${getFrontendBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Si un compte existe avec cette adresse, un lien de reinitialisation a ete envoye.',
    });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');

    if (!token || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Lien de reinitialisation et nouveau mot de passe requis.',
      });
    }

    if (password.length < 8 || !isStrongPassword(password)) {
      return res.status(400).json({
        status: 'error',
        message: 'Le mot de passe doit contenir au moins 8 caracteres, une majuscule, une minuscule et un chiffre.',
      });
    }

    const decoded = jwt.decode(token);
    const userId = typeof decoded?.sub === 'string' ? decoded.sub : '';
    if (!userId || decoded?.purpose !== 'password_reset') {
      return res.status(400).json({
        status: 'error',
        message: 'Lien de reinitialisation invalide ou expire.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user?.password) {
      return res.status(400).json({
        status: 'error',
        message: 'Lien de reinitialisation invalide ou expire.',
      });
    }

    let verified;
    try {
      verified = jwt.verify(token, getPasswordResetSecret(user), { algorithms: ['HS256'] });
    } catch (_) {
      return res.status(400).json({
        status: 'error',
        message: 'Lien de reinitialisation invalide ou expire.',
      });
    }

    if (verified?.purpose !== 'password_reset' || verified?.sub !== user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Lien de reinitialisation invalide ou expire.',
      });
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Votre mot de passe a ete mis a jour.',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  googleAuth,
  getSession,
  getCurrentUser,
  logout,
  updateProfile,
  deleteAccount,
  register,
  login,
  forgotPassword,
  resetPassword,
};
