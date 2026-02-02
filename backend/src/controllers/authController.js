const { PrismaClient } = require('@prisma/client');
const { verifyGoogleToken } = require('../services/googleAuth');
const { generateToken, setTokenCookie, clearTokenCookie } = require('../utils/jwt');
const { ROLES, STATUS } = require('../middleware/auth');

const prisma = new PrismaClient();

/**
 * Google OAuth login/register
 * POST /api/auth/google
 * Body: { credential: "google-id-token", customName: "Prénom Nom" (optional), accountType: "CLIENT" | "PRO" (optional) }
 */
async function googleAuth(req, res, next) {
  try {
    const { credential, customName, accountType } = req.body;

    if (!credential) {
      return res.status(400).json({
        status: 'error',
        message: 'Google credential is required',
      });
    }

    // Verify the Google token
    const googleUser = await verifyGoogleToken(credential);

    // Use custom name if provided, otherwise use Google name
    const userName = customName || googleUser.name;

    // Determine role and status based on account type
    const role = accountType === 'PRO' ? ROLES.PRO : ROLES.CLIENT;
    const status = role === ROLES.PRO ? STATUS.PENDING : STATUS.APPROVED;

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { googleSub: googleUser.googleSub },
    });

    let isNewUser = false;

    if (user) {
      // Update existing user - keep custom name if already set, use new custom name if provided
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: customName || user.name || googleUser.name,
          // Don't update picture automatically - user controls this
          email: googleUser.email,
        },
      });
      console.log(`✅ User logged in: ${user.email} (role: ${user.role}, status: ${user.status})`);
    } else {
      // Create new user with custom name (no picture by default)
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          googleSub: googleUser.googleSub,
          name: userName,
          picture: null, // User will add photo later if they want
          role: role,
          status: status,
        },
      });
      console.log(`✅ New ${role} registered: ${user.email} (${userName}) - Status: ${status}`);
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set token as httpOnly cookie
    setTokenCookie(res, token);

    // Return user info (without sensitive data)
    res.status(200).json({
      status: 'success',
      message: isNewUser ? 'Account created successfully' : 'Logged in successfully',
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
        isNewUser,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    next(error);
  }
}

/**
 * Get current authenticated user
 * GET /api/auth/me
 * Requires: Authentication
 */
async function getCurrentUser(req, res, next) {
  try {
    // req.user is set by the authenticate middleware
    res.status(200).json({
      status: 'success',
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout - clears the JWT cookie
 * POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    clearTokenCookie(res);

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user profile
 * PATCH /api/auth/profile
 * Requires: Authentication
 */
async function updateProfile(req, res, next) {
  try {
    const { username, phoneNumber, name } = req.body;
    const userId = req.user.id;

    // Validate username uniqueness if provided
    if (username) {
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          status: 'error',
          message: 'This username is already taken',
        });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(phoneNumber && { phoneNumber }),
        ...(name && { name }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        picture: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete user account
 * DELETE /api/auth/account
 * Requires: Authentication
 */
async function deleteAccount(req, res, next) {
  try {
    const userId = req.user.id;

    await prisma.user.delete({
      where: { id: userId },
    });

    clearTokenCookie(res);

    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  googleAuth,
  getCurrentUser,
  logout,
  updateProfile,
  deleteAccount,
};
