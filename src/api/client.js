const BASE_URL = import.meta.env.VITE_API_URL || '/api'

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

async function apiFetch(path, { method = 'GET', body, headers = {}, ...options } = {}) {
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

  if (body !== undefined) {
    fetchOptions.body = isFormData
      ? body
      : typeof body === 'string'
        ? body
        : JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(url, fetchOptions)
  } catch (_) {
    const error = new Error('Impossible de joindre le serveur. Verifiez votre connexion puis reessayez.')
    error.status = 0
    error.url = url
    throw error
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
