let inMemoryAuthToken = null
let inMemoryCsrfToken = null
const AUTH_TOKEN_STORAGE_KEY = 'flashrv_auth_token'
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
  if (!inMemoryAuthToken) {
    inMemoryAuthToken = readFromSessionStorage(AUTH_TOKEN_STORAGE_KEY)
  }

  const token = String(inMemoryAuthToken || '').trim()
  return token || null
}

export function writeAuthToken(token) {
  const nextToken = String(token || '').trim()
  inMemoryAuthToken = nextToken || null
  writeToSessionStorage(AUTH_TOKEN_STORAGE_KEY, inMemoryAuthToken)
}

export function clearAuthToken() {
  inMemoryAuthToken = null
  writeToSessionStorage(AUTH_TOKEN_STORAGE_KEY, null)
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

  if (!normalized.Authorization && !normalized.authorization) {
    const token = readAuthToken()
    if (token) {
      normalized.Authorization = `Bearer ${token}`
    }
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
