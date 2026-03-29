const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && String(JWT_SECRET).length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters in production');
  process.exit(1);
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';

function normalizeSameSite(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return COOKIE_SECURE ? 'none' : 'lax';
  if (raw === 'none' || raw === 'lax' || raw === 'strict') return raw;
  if (raw === 'false') return false;
  return COOKIE_SECURE ? 'none' : 'lax';
}

function normalizeCookieDomain(value) {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  // Keep a conservative domain format to avoid runtime cookie serialization errors.
  if (/^[a-z0-9.-]+$/i.test(raw)) return raw;
  return undefined;
}

const COOKIE_SAMESITE = normalizeSameSite(process.env.COOKIE_SAMESITE);
const COOKIE_DOMAIN = normalizeCookieDomain(process.env.COOKIE_DOMAIN);

/**
 * Generate a JWT token for a user
 * @param {Object} payload - The payload to encode (typically { userId, email })
 * @returns {string} The JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
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
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
  });
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
  try {
    res.cookie('token', token, cookieOptions);
  } catch (error) {
    // Never break auth flow because of an invalid cookie option in env.
    console.error('JWT cookie set failed, applying safe fallback options:', error?.message || error);
    res.cookie('token', token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SECURE ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}

/**
 * Clear JWT token cookie
 * @param {Object} res - Express response object
 */
function clearTokenCookie(res) {
  try {
    res.cookie('token', '', {
      ...cookieOptions,
      maxAge: 0,
    });
  } catch (error) {
    console.error('JWT cookie clear failed, applying safe fallback options:', error?.message || error);
    res.cookie('token', '', {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SECURE ? 'none' : 'lax',
      maxAge: 0,
      path: '/',
    });
  }
}

module.exports = {
  generateToken,
  verifyToken,
  setTokenCookie,
  clearTokenCookie,
  cookieOptions,
};
