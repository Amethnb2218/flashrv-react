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
    // Get token from cookie or Authorization header
    let token = req.cookies.token;
    // ...
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.replace('Bearer ', '').trim();
      // ...
    }
    if (!token) {
      console.warn('[AUTH] Aucun token trouvé dans cookie ou header');
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated. Token missing in cookie or header.',
        debug: {
          cookies: req.cookies,
          headers: req.headers,
        }
      });
    }
    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
      // ...
    } catch (e) {
      // ...
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token: ' + e.message,
        debug: {
          token,
        }
      });
    }
    // Find user in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    if (!user) {
      // ...
      return res.status(401).json({
        status: 'error',
        message: 'User not found for userId: ' + decoded.userId,
        debug: {
          decoded,
          token,
          allUsers,
        }
      });
    }
    if (user.status === STATUS.SUSPENDED) {
      // ...
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been suspended. Contact support.',
        debug: { user }
      });
    }
    if (user.status === STATUS.REJECTED) {
      // ...
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been rejected.',
        debug: { user }
      });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('[AUTH] Erreur inattendue:', err);
    return res.status(401).json({
      status: 'error',
      message: 'Unexpected error in authenticate: ' + err.message,
      debug: {
        cookies: req.cookies,
        headers: req.headers,
        err: err.message,
      }
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
    // Autorise PRO, SALON_OWNER, ADMIN, SUPER_ADMIN
    const allowedRoles = ['PRO', 'SALON_OWNER', 'ADMIN', 'SUPER_ADMIN'];
    if (!roles.includes(req.user.role) && !allowedRoles.includes(req.user.role)) {
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
    console.warn('[requireApprovedPro] Pas de req.user');
    return res.status(401).json({
      status: 'error',
      message: 'Not authenticated',
    });
  }

  // Log l'utilisateur pour debug
  // ...

  // SUPER_ADMIN and ADMIN bypass this check
  if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.ADMIN) {
    return next();
  }

  // PRO must be approved
  if (req.user.role === ROLES.PRO) {
    if (req.user.status !== STATUS.APPROVED) {
      // ...
      return res.status(403).json({
        status: 'error',
        message: 'Your PRO account is pending approval. Please wait for validation.',
        code: 'PRO_PENDING',
        debug: { user: req.user }
      });
    }
    // Restriction: canCreateService, canBook, isPublic
    if (req.user.canCreateService === false) {
      // ...
      return res.status(403).json({
        status: 'error',
        message: 'You are not allowed to create services. Contact admin.',
        code: 'PRO_RESTRICTED_SERVICE',
        debug: { user: req.user }
      });
    }
    if (req.user.canBook === false) {
      // ...
      return res.status(403).json({
        status: 'error',
        message: 'You are not allowed to accept bookings. Contact admin.',
        code: 'PRO_RESTRICTED_BOOK',
        debug: { user: req.user }
      });
    }
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
  // Restriction: isRestricted
  if (req.user.role === ROLES.ADMIN && req.user.isRestricted === true) {
    return res.status(403).json({
      status: 'error',
      message: 'Your ADMIN account is restricted. Contact SUPER_ADMIN.',
      code: 'ADMIN_RESTRICTED',
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