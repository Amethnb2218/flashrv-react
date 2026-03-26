const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '')

const readEnvApiBase = () => trimTrailingSlash(import.meta.env.VITE_API_URL || '')

const resolveLocalApiBase = () => {
  const port = String(import.meta.env.VITE_BACKEND_PORT || '4000').trim() || '4000'
  return `http://localhost:${port}/api`
}

const isLocalBrowserHost = () => {
  if (typeof window === 'undefined') return false
  return LOCAL_HOSTNAMES.has(String(window.location.hostname || '').toLowerCase())
}

export const resolveApiBase = () => {
  // In local browser sessions, force local backend to avoid stale production API URLs.
  if (isLocalBrowserHost()) return resolveLocalApiBase()

  const envApiBase = readEnvApiBase()
  if (envApiBase) return envApiBase

  return '/api'
}

export const resolveApiOrigin = () => {
  const apiBase = resolveApiBase()
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    return trimTrailingSlash(apiBase.replace(/\/api\/?$/, ''))
  }

  if (typeof window === 'undefined') return ''

  if (import.meta.env.DEV) {
    const port = String(import.meta.env.VITE_BACKEND_PORT || '4000').trim() || '4000'
    return `${window.location.protocol}//${window.location.hostname}:${port}`
  }

  return trimTrailingSlash(window.location.origin)
}
