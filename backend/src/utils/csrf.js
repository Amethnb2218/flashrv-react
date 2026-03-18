const crypto = require('crypto');

const CSRF_SECRET = String(process.env.CSRF_SECRET || process.env.JWT_SECRET || '').trim();

if (!CSRF_SECRET) {
  console.error('FATAL: CSRF_SECRET or JWT_SECRET environment variable is required');
  process.exit(1);
}

function normalize(value) {
  return String(value || '').trim();
}

function buildCsrfToken(authToken) {
  const token = normalize(authToken);
  if (!token) return '';
  return crypto.createHmac('sha256', CSRF_SECRET).update(token).digest('hex');
}

function safeEqual(a, b) {
  const aNorm = normalize(a);
  const bNorm = normalize(b);
  if (!aNorm || !bNorm) return false;
  const aBuf = Buffer.from(aNorm, 'utf8');
  const bBuf = Buffer.from(bNorm, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyCsrfToken(authToken, providedCsrfToken) {
  const expected = buildCsrfToken(authToken);
  return safeEqual(expected, providedCsrfToken);
}

function readCsrfHeader(req) {
  return (
    req.get('x-csrf-token') ||
    req.get('x-xsrf-token') ||
    req.headers['x-csrf-token'] ||
    req.headers['x-xsrf-token'] ||
    ''
  );
}

module.exports = {
  buildCsrfToken,
  verifyCsrfToken,
  readCsrfHeader,
};
