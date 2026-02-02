const { verifyToken } = require('../utils/jwt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ============================================
// CONSTANTS
// ============================================
const ROLES = {
  CLIENT: 'CLIENT',
  PRO: 'PRO',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

const STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
};

/**
 * Authentication middleware - verifies JWT token from cookies
 * Attaches user to req.user if authenticated
 */
async function authenticate(req, res, next) {
  try {
    // Get token from cookie
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated. Please log in.',
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found. Please log in again.',
      });
    }

    // Check if user is suspended
    if (user.status === STATUS.SUSPENDED) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been suspended. Contact support.',
      });
    }

    // Check if user is rejected
    if (user.status === STATUS.REJECTED) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been rejected.',
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token. Please log in again.',
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 * Attaches user to req.user if authenticated, otherwise continues
 */
async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        picture: true,
        role: true,
      },
    });

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Token invalid but we continue anyway
    next();
  }
}

/**
 * Role-based authorization middleware
 * @param {...string} roles - Allowed roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action',
      });
    }

    next();
  };
}

/**
 * Middleware for PRO-only routes that require APPROVED status
 * Use after authenticate middleware
 */
function requireApprovedPro(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authenticated',
    });
  }

  // SUPER_ADMIN and ADMIN bypass this check
  if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.ADMIN) {
    return next();
  }

  // PRO must be approved
  if (req.user.role === ROLES.PRO && req.user.status !== STATUS.APPROVED) {
    return res.status(403).json({
      status: 'error',
      message: 'Your PRO account is pending approval. Please wait for validation.',
      code: 'PRO_PENDING',
    });
  }

  next();
}

/**
 * Middleware for ADMIN-only routes
 * Allows ADMIN and SUPER_ADMIN
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authenticated',
    });
  }

  if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      status: 'error',
      message: 'Admin access required',
    });
  }

  next();
}

/**
 * Middleware for SUPER_ADMIN-only routes
 * Only SUPER_ADMIN can access
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authenticated',
    });
  }

  if (req.user.role !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      status: 'error',
      message: 'Super Admin access required',
    });
  }

  next();
}

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  requireApprovedPro,
  requireAdmin,
  requireSuperAdmin,
  ROLES,
  STATUS,
};
