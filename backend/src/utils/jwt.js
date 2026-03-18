const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || (COOKIE_SECURE ? 'none' : 'lax');
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

/**
 * Generate a JWT token for a user
 * @param {Object} payload - The payload to encode (typically { userId, email })
 * @returns {string} The JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {Object} The decoded payload
 * @throws {Error} If token is invalid or expired
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Cookie options for JWT token
 */
const cookieOptions = {
  httpOnly: true, // Not accessible via JavaScript
  secure: COOKIE_SECURE, // HTTPS only in production
  sameSite: COOKIE_SAMESITE, // configurable (none/lax/strict)
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/',
  ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
};

/**
 * Set JWT token as httpOnly cookie
 * @param {Object} res - Express response object
 * @param {string} token - The JWT token
 */
function setTokenCookie(res, token) {
  res.cookie('token', token, cookieOptions);
}

/**
 * Clear JWT token cookie
 * @param {Object} res - Express response object
 */
function clearTokenCookie(res) {
  res.cookie('token', '', {
    ...cookieOptions,
    maxAge: 0,
  });
}

module.exports = {
  generateToken,
  verifyToken,
  setTokenCookie,
  clearTokenCookie,
  cookieOptions,
};
