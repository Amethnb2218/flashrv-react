// src/api/client.js
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function apiFetch(path, { method = 'GET', body, headers = {}, ...options } = {}) {
  const url = `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  // Ajout du token Authorization si présent dans le localStorage
  const token = localStorage.getItem('flashrv_token');
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  const fetchOptions = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...headers,
    },
    ...options,
  };
  if (body !== undefined) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
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
    const msg = data.message || data.error || res.statusText;
    throw new Error(msg);
  }
  return data;
}

export default apiFetch;
