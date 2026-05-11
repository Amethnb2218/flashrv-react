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

export function readAuthToken() {
  return null
}

export function writeAuthToken(token) {
  // Token is now managed exclusively via httpOnly cookie - no client-side storage
}

export function clearAuthToken() {
  // Clean up any legacy stored tokens
  const ls = getLocalStorage()
  const ss = getSessionStorage()
  if (ls) ls.removeItem('flashrv_auth_token')
  if (ss) ss.removeItem('flashrv_auth_token')
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

  const normalizedMethod = String(method || 'GET').trim().toUpperCase()
  if (!SAFE_HTTP_METHODS.has(normalizedMethod) && !normalized['X-CSRF-Token'] && !normalized['x-csrf-token']) {
    const csrfToken = readCsrfToken()
    if (csrfToken) {
      normalized['X-CSRF-Token'] = csrfToken
    }
  }

  return normalized
}
