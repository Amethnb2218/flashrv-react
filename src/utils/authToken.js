let inMemoryCsrfToken = null
const CSRF_TOKEN_STORAGE_KEY = 'flashrv_csrf_token'

const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function readStorageValue(storage, key) {
  if (!storage) return null
  try {
    const value = storage.getItem(key)
    return String(value || '').trim() || null
  } catch (_) {
    return null
  }
}

function writeStorageValue(storage, key, value) {
  if (!storage) return
  try {
    if (!value) {
      storage.removeItem(key)
      return
    }
    storage.setItem(key, value)
  } catch (_) {}
}

function getLocalStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function getSessionStorage() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage
}

const AUTH_TOKEN_KEY = 'flashrv_auth_token'

export function readAuthToken() {
  return readStorageValue(getLocalStorage(), AUTH_TOKEN_KEY)
    || readStorageValue(getSessionStorage(), AUTH_TOKEN_KEY)
    || null
}

export function writeAuthToken(token) {
  const nextToken = String(token || '').trim()
  if (!nextToken) {
    clearAuthToken()
    return
  }
  writeStorageValue(getLocalStorage(), AUTH_TOKEN_KEY, nextToken)
  writeStorageValue(getSessionStorage(), AUTH_TOKEN_KEY, nextToken)
}

export function clearAuthToken() {
  const ls = getLocalStorage()
  const ss = getSessionStorage()
  if (ls) ls.removeItem(AUTH_TOKEN_KEY)
  if (ss) ss.removeItem(AUTH_TOKEN_KEY)
}

export function readCsrfToken() {
  if (!inMemoryCsrfToken) {
    inMemoryCsrfToken = readStorageValue(getLocalStorage(), CSRF_TOKEN_STORAGE_KEY)
      || readStorageValue(getSessionStorage(), CSRF_TOKEN_STORAGE_KEY)
  }
  const token = String(inMemoryCsrfToken || '').trim()
  return token || null
}

export function writeCsrfToken(token) {
  const nextToken = String(token || '').trim()
  inMemoryCsrfToken = nextToken || null
  writeStorageValue(getLocalStorage(), CSRF_TOKEN_STORAGE_KEY, inMemoryCsrfToken)
  writeStorageValue(getSessionStorage(), CSRF_TOKEN_STORAGE_KEY, inMemoryCsrfToken)
}

export function clearCsrfToken() {
  inMemoryCsrfToken = null
  writeStorageValue(getLocalStorage(), CSRF_TOKEN_STORAGE_KEY, null)
  writeStorageValue(getSessionStorage(), CSRF_TOKEN_STORAGE_KEY, null)
}

export function buildAuthHeaders(headers = {}, method = 'GET') {
  const normalized = { ...headers }

  const token = readAuthToken()
  if (token && !normalized['Authorization'] && !normalized['authorization']) {
    normalized['Authorization'] = `Bearer ${token}`
  }

  const normalizedMethod = String(method || 'GET').trim().toUpperCase()
  if (!SAFE_HTTP_METHODS.has(normalizedMethod) && !normalized['X-CSRF-Token'] && !normalized['x-csrf-token']) {
    const csrfToken = readCsrfToken()
    if (csrfToken) {
      normalized['X-CSRF-Token'] = csrfToken
    }
  }

  return normalized
}
