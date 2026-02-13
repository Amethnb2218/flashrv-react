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
    // Vérifier unicité email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Email déjà utilisé' });
    }
    // Statut selon rôle
    const userStatus = role.toUpperCase() === 'PRO' ? STATUS.PENDING : STATUS.APPROVED;
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const userData = {
      name,
      email,
      phoneNumber: phone,
      role: role.toUpperCase(),
      status: userStatus,
      googleSub: googleSub || null,
      password: hashedPassword,
    };
    const user = await prisma.user.create({
      data: userData,
    });
    // Générer un token (mock, à sécuriser en prod)
    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    setTokenCookie(res, token);
    return res.status(201).json({
      status: 'success',
      message: 'Inscription réussie',
      data: { user, token },
    });
  } catch (error) {
    return next(error);
  }
}
const { PrismaClient } = require("@prisma/client");
const { verifyGoogleToken } = require("../services/googleAuth");
const { generateToken, setTokenCookie, clearTokenCookie } = require("../utils/jwt");
const { ROLES, STATUS } = require("../middleware/auth");

const prisma = new PrismaClient();

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
        message: "Google credential is required",
      });
    }

    // Verify the Google token
    const googleUser = await verifyGoogleToken(credential);

    // ✅ rendre robuste selon ce que retourne verifyGoogleToken
    const googleSub = googleUser.googleSub || googleUser.sub;
    const email = googleUser.email;
    const googleName = googleUser.name || "";

    if (!googleSub || !email) {
      return res.status(401).json({
        status: "error",
        message: "Invalid Google token (missing sub/email)",
      });
    }

    // Use custom name if provided, otherwise use Google name
    const userName = String(customName || googleName || "").trim();

    // Determine role and status based on account type
    const role = accountType === "PRO" ? ROLES.PRO : ROLES.CLIENT;
    const status = role === ROLES.PRO ? STATUS.PENDING : STATUS.APPROVED;

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { googleSub: googleSub },
    });

    let isNewUser = false;


    if (user) {
      // Update existing user - keep custom name if already set, use new custom name if provided
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: userName || user.name || googleName,
          email: email,
        },
      });
      console.log(
        `✅ User logged in: ${user.email} (role: ${user.role}, status: ${user.status})`
      );
    } else {
      // Create new user
      isNewUser = true;

      // Création simple du user PRO, le salon sera créé via le formulaire d'onboarding
      const bcrypt = require('bcrypt');
      const randomPassword = require('crypto').randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
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
      console.log(
        `✅ New ${role} registered: ${user.email} (${user.name}) - Status: ${user.status}`
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set token as httpOnly cookie
    setTokenCookie(res, token);

    // Return user info (without sensitive data) + token (comme /register)
    return res.status(200).json({
      status: "success",
      message: isNewUser ? "Account created successfully" : "Logged in successfully",
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
        token,
        isNewUser,
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

    await prisma.user.delete({
      where: { id: userId },
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

module.exports = {
  googleAuth,
  getCurrentUser,
  logout,
  updateProfile,
  deleteAccount,
  register,
};