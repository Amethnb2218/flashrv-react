const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '').replace(/\/$/, '');

const inferBackendOrigin = () => {
  if (API_ORIGIN) return API_ORIGIN;
  if (typeof window === 'undefined') return '';
  if (import.meta.env.DEV) {
    const port = String(import.meta.env.VITE_BACKEND_PORT || '4000');
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }
  return window.location.origin;
};

export const resolveMediaUrl = (src) => {
  if (!src) return '';
  let value = typeof src === 'object'
    ? String(src.url || src.path || src.location || src.secure_url || src.uri || '')
    : String(src);

  value = value.trim().replace(/\\/g, '/');
  if (!value) return '';
  if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }

  if (value.startsWith('/api/uploads/')) {
    value = value.slice(4);
  }

  const origin = inferBackendOrigin();
  if (value.startsWith('/')) return origin ? `${origin}${value}` : value;
  return origin ? `${origin}/${value}` : `/${value}`;
};

