function toOrigin(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (!/^https?:$/i.test(url.protocol)) return null;
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch (_) {
    return null;
  }
}

function parseOrigins(...values) {
  const parsed = values
    .flatMap((value) => String(value || '').split(','))
    .map((item) => toOrigin(item))
    .filter(Boolean);

  return [...new Set(parsed)];
}

function getAllowedOrigins() {
  const origins = parseOrigins(
    process.env.ALLOWED_ORIGINS,
    process.env.FRONTEND_URL,
    process.env.BASE_URL
  );

  if (process.env.NODE_ENV !== 'production') {
    [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ].forEach((origin) => {
      const normalized = toOrigin(origin);
      if (normalized && !origins.includes(normalized)) origins.push(normalized);
    });
  }

  return origins;
}

function getRequestOrigin(req) {
  const origin = toOrigin(req?.headers?.origin);
  if (origin) return origin;

  try {
    const referer = String(req?.headers?.referer || '').trim();
    if (!referer) return null;
    return toOrigin(new URL(referer).origin);
  } catch (_) {
    return null;
  }
}

function isOriginAllowed(origin, options = {}) {
  const normalized = toOrigin(origin);
  const allowNoOrigin =
    options.allowNoOrigin !== undefined
      ? options.allowNoOrigin
      : process.env.NODE_ENV !== 'production';

  if (!normalized) return Boolean(allowNoOrigin);
  return getAllowedOrigins().includes(normalized);
}

module.exports = {
  toOrigin,
  parseOrigins,
  getAllowedOrigins,
  getRequestOrigin,
  isOriginAllowed,
};
