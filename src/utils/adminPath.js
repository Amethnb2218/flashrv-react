const FALLBACK_ADMIN_PATH = '/backoffice'

function normalizeAdminPath(pathValue) {
  const raw = String(pathValue || '').trim()
  if (!raw) return FALLBACK_ADMIN_PATH

  let normalized = raw.startsWith('/') ? raw : `/${raw}`
  normalized = normalized.replace(/\/+/g, '/').replace(/\/+$/, '')
  if (!normalized || normalized === '/') return FALLBACK_ADMIN_PATH
  return normalized
}

export const ADMIN_PATH = normalizeAdminPath(import.meta.env.VITE_ADMIN_PATH)
export const ADMIN_PATH_ROUTE_SEGMENT = ADMIN_PATH.replace(/^\//, '')

export function toAdminPath(suffix = '') {
  const cleanSuffix = String(suffix || '').trim()
  if (!cleanSuffix) return ADMIN_PATH
  return cleanSuffix.startsWith('/') ? `${ADMIN_PATH}${cleanSuffix}` : `${ADMIN_PATH}/${cleanSuffix}`
}

