let inMemoryCsrfToken = null
const CSRF_TOKEN_STORAGE_KEY = 'flashrv_csrf_token'

const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function readFromSessionStorage(key) {
  if (typeof window === 'undefined') return null

  try {
    const value = window.sessionStorage.getItem(key)
    return String(value || '').trim() || null
  } catch (_) {
    return null
  }
}

function writeToSessionStorage(key, value) {
  if (typeof window === 'undefined') return

  try {
    if (!value) {
      window.sessionStorage.removeItem(key)
      return
    }
    window.sessionStorage.setItem(key, value)
  } catch (_) {
    // Ignore storage errors to avoid blocking authentication flows.
  }
}

export function readAuthToken() {
  return null
}

export function writeAuthToken(token) {
  return String(token || '').trim() || null
}

export function clearAuthToken() {
  return null
}

export function readCsrfToken() {
  if (!inMemoryCsrfToken) {
    inMemoryCsrfToken = readFromSessionStorage(CSRF_TOKEN_STORAGE_KEY)
  }

  const token = String(inMemoryCsrfToken || '').trim()
  return token || null
}

export function writeCsrfToken(token) {
  const nextToken = String(token || '').trim()
  inMemoryCsrfToken = nextToken || null
  writeToSessionStorage(CSRF_TOKEN_STORAGE_KEY, inMemoryCsrfToken)
}

export function clearCsrfToken() {
  inMemoryCsrfToken = null
  writeToSessionStorage(CSRF_TOKEN_STORAGE_KEY, null)
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
