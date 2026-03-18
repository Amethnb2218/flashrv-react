let inMemoryAuthToken = null
let inMemoryCsrfToken = null

const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function readAuthToken() {
  const token = String(inMemoryAuthToken || '').trim()
  return token || null
}

export function writeAuthToken(token) {
  const nextToken = String(token || '').trim()
  inMemoryAuthToken = nextToken || null
}

export function clearAuthToken() {
  inMemoryAuthToken = null
}

export function readCsrfToken() {
  const token = String(inMemoryCsrfToken || '').trim()
  return token || null
}

export function writeCsrfToken(token) {
  const nextToken = String(token || '').trim()
  inMemoryCsrfToken = nextToken || null
}

export function clearCsrfToken() {
  inMemoryCsrfToken = null
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
