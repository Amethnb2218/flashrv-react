// src/api/client.js
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function apiFetch(path, { method = 'GET', body, headers = {}, ...options } = {}) {
  const url = `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  // Ajout du token Authorization ET cookie si présent dans le localStorage
  const token = localStorage.getItem('flashrv_token');
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  const hasAuth = Boolean(token);
  // Forcer le cookie token à chaque requête (pour Express backend)
  if (hasAuth) {
    document.cookie = `token=${token}; path=/; SameSite=Lax`;
  }
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const finalHeaders = {
    ...authHeader,
    ...headers,
  };
  if (!isFormData && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  const fetchOptions = {
    method,
    credentials: hasAuth ? 'include' : 'omit',
    headers: finalHeaders,
    cache: 'no-store',
    ...options,
  };
  if (body !== undefined) {
    fetchOptions.body = isFormData
      ? body
      : typeof body === 'string'
      ? body
      : JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    console.error('Réponse non JSON:', text);
    throw new Error(`Réponse non JSON pour ${url}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText;
    throw new Error(msg);
  }
  // Correction: si la réponse est un tableau, retourne-le directement
  if (Array.isArray(data)) return data;
  return data;
}

export default apiFetch;

