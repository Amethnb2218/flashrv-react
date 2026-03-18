const AUTH_TOKEN_KEY = 'flashrv_auth_token'

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

export function readAuthToken() {
  if (!canUseSessionStorage()) return null
  try {
    const token = String(sessionStorage.getItem(AUTH_TOKEN_KEY) || '').trim()
    return token || null
  } catch (_) {
    return null
  }
}

export function writeAuthToken(token) {
  if (!canUseSessionStorage()) return
  const nextToken = String(token || '').trim()
  try {
    if (!nextToken) {
      sessionStorage.removeItem(AUTH_TOKEN_KEY)
      return
    }
    sessionStorage.setItem(AUTH_TOKEN_KEY, nextToken)
  } catch (_) {
    // noop
  }
}

export function clearAuthToken() {
  if (!canUseSessionStorage()) return
  try {
    sessionStorage.removeItem(AUTH_TOKEN_KEY)
  } catch (_) {
    // noop
  }
}

export function buildAuthHeaders(headers = {}) {
  const normalized = { ...headers }
  if (normalized.Authorization || normalized.authorization) {
    return normalized
  }

  const token = readAuthToken()
  if (!token) return normalized

  return {
    ...normalized,
    Authorization: `Bearer ${token}`,
  }
}
