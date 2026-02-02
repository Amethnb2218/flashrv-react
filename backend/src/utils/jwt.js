const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

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
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/',
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
