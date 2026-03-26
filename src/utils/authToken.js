let inMemoryAuthToken = null
let inMemoryCsrfToken = null
const AUTH_TOKEN_STORAGE_KEY = 'flashrv_auth_token'
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
  } catch (_) {
    // Ignore storage errors to avoid blocking authentication flows.
  }
}

function getLocalStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function getSessionStorage() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage
}

function readFromPersistentStorage(key) {
  const localValue = readStorageValue(getLocalStorage(), key)
  if (localValue) return localValue

  const sessionValue = readStorageValue(getSessionStorage(), key)
  if (sessionValue) {
    writeStorageValue(getLocalStorage(), key, sessionValue)
  }
  return sessionValue
}

function writeToPersistentStorage(key, value) {
  writeStorageValue(getLocalStorage(), key, value)
  writeStorageValue(getSessionStorage(), key, value)
}

export function readAuthToken() {
  if (!inMemoryAuthToken) {
    inMemoryAuthToken = readFromPersistentStorage(AUTH_TOKEN_STORAGE_KEY)
  }

  const token = String(inMemoryAuthToken || '').trim()
  return token || null
}

export function writeAuthToken(token) {
  const nextToken = String(token || '').trim()
  inMemoryAuthToken = nextToken || null
  writeToPersistentStorage(AUTH_TOKEN_STORAGE_KEY, inMemoryAuthToken)
}

export function clearAuthToken() {
  inMemoryAuthToken = null
  writeToPersistentStorage(AUTH_TOKEN_STORAGE_KEY, null)
}

export function readCsrfToken() {
  if (!inMemoryCsrfToken) {
    inMemoryCsrfToken = readFromPersistentStorage(CSRF_TOKEN_STORAGE_KEY)
  }

  const token = String(inMemoryCsrfToken || '').trim()
  return token || null
}

export function writeCsrfToken(token) {
  const nextToken = String(token || '').trim()
  inMemoryCsrfToken = nextToken || null
  writeToPersistentStorage(CSRF_TOKEN_STORAGE_KEY, inMemoryCsrfToken)
}

export function clearCsrfToken() {
  inMemoryCsrfToken = null
  writeToPersistentStorage(CSRF_TOKEN_STORAGE_KEY, null)
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
