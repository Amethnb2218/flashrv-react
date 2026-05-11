const crypto = require('crypto');

const CSRF_SECRET = String(process.env.CSRF_SECRET || '').trim();

if (!CSRF_SECRET) {
  console.error('FATAL: CSRF_SECRET environment variable is required (must be independent of JWT_SECRET)');
  process.exit(1);
}

function normalize(value) {
  return String(value || '').trim();
}

function buildCsrfToken(authToken) {
  const token = normalize(authToken);
  if (!token) return '';
  const nonce = crypto.randomBytes(16).toString('hex');
  const signature = crypto.createHmac('sha256', CSRF_SECRET).update(`${nonce}:${token}`).digest('hex');
  return `${nonce}.${signature}`;
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
  const token = normalize(authToken);
  const provided = normalize(providedCsrfToken);
  if (!token || !provided) return false;

  const dotIndex = provided.indexOf('.');
  if (dotIndex < 1) return false;

  const nonce = provided.substring(0, dotIndex);
  const signature = provided.substring(dotIndex + 1);
  const expected = crypto.createHmac('sha256', CSRF_SECRET).update(`${nonce}:${token}`).digest('hex');
  return safeEqual(expected, signature);
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
