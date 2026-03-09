const BASE_URL = import.meta.env.VITE_API_URL || '/api'
const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000)
const RETRYABLE_HTTP_STATUSES = new Set([0, 408, 425, 429, 500, 502, 503, 504])

function buildHttpErrorMessage(status, fallbackText = '') {
  if (status === 502 || status === 503 || status === 504) {
    return 'Le serveur est temporairement indisponible. Reessayez dans un instant.'
  }
  if (status === 401) {
    return 'Votre session a expire. Reconnectez-vous puis recommencez.'
  }
  if (status === 403) {
    return 'Vous n avez pas les autorisations necessaires pour cette action.'
  }
  if (status === 404) {
    return 'La ressource demandee est introuvable.'
  }
  if (status >= 500) {
    return 'Une erreur serveur est survenue. Reessayez dans quelques instants.'
  }
  return fallbackText || 'La requete a echoue.'
}

export function isRetryableHttpStatus(status) {
  return RETRYABLE_HTTP_STATUSES.has(Number(status))
}

export function isRetryableHttpError(error) {
  return isRetryableHttpStatus(error?.status)
}

async function apiFetch(path, { method = 'GET', body, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, ...options } = {}) {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  const token = sessionStorage.getItem('flashrv_token')
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {}
  const hasAuth = Boolean(token)

  if (hasAuth) {
    document.cookie = `token=${token}; path=/; SameSite=Lax`
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const finalHeaders = {
    ...authHeader,
    ...headers,
  }

  if (!isFormData && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json'
  }

  const fetchOptions = {
    method,
    credentials: hasAuth ? 'include' : 'omit',
    headers: finalHeaders,
    cache: 'no-store',
    ...options,
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  if (controller) {
    fetchOptions.signal = controller.signal
  }

  if (body !== undefined) {
    fetchOptions.body = isFormData
      ? body
      : typeof body === 'string'
        ? body
        : JSON.stringify(body)
  }

  let res
  const timeoutValue = Number(timeoutMs)
  const shouldTimeout = Number.isFinite(timeoutValue) && timeoutValue > 0
  const timeoutId = controller && shouldTimeout
    ? setTimeout(() => controller.abort(), timeoutValue)
    : null

  try {
    res = await fetch(url, fetchOptions)
  } catch (fetchError) {
    if (fetchError?.name === 'AbortError') {
      const timeoutError = new Error('Le serveur met trop de temps a repondre. Reessayez dans un instant.')
      timeoutError.status = 408
      timeoutError.url = url
      throw timeoutError
    }
    const networkError = new Error('Impossible de joindre le serveur. Verifiez votre connexion puis reessayez.')
    networkError.status = 0
    networkError.url = url
    throw networkError
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  const text = await res.text()
  let data = {}

  if (text) {
    const trimmed = text.trim()
    const looksLikeJson =
      contentType.includes('application/json') ||
      trimmed.startsWith('{') ||
      trimmed.startsWith('[')

    if (looksLikeJson) {
      try {
        data = JSON.parse(text)
      } catch (_) {
        const error = new Error('Le serveur a retourne une reponse invalide.')
        error.status = res.status
        error.url = url
        throw error
      }
    } else {
      data = null
    }
  }

  if (!res.ok) {
    const serverMessage =
      (typeof data?.message === 'string' && data.message) ||
      (typeof data?.error === 'string' && data.error) ||
      (typeof data?.error?.message === 'string' && data.error.message) ||
      ''
    const normalizedServerMessage = serverMessage.trim().toLowerCase()
    const isGenericServerMessage =
      normalizedServerMessage === 'something went wrong' ||
      normalizedServerMessage === 'internal server error' ||
      normalizedServerMessage === 'failed to fetch'

    const error = new Error(
      serverMessage && !isGenericServerMessage
        ? serverMessage
        : buildHttpErrorMessage(res.status, res.statusText)
    )
    error.status = res.status
    error.url = url
    error.payload = data
    throw error
  }

  if (text && data == null) {
    const error = new Error('Le serveur a retourne une reponse non exploitable.')
    error.status = res.status
    error.url = url
    throw error
  }

  if (Array.isArray(data)) return data
  return data
}

export default apiFetch
