import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { buildAuthHeaders } from '../../utils/authToken'
import { resolveApiBase } from '../../utils/apiBase'

const API_URL = resolveApiBase()
const VISITOR_ID_KEY = 'flashrv_site_visitor_id'
const SESSION_ID_KEY = 'flashrv_site_session_id'
const TRACKING_STATE_KEY = 'flashrv_site_visit_state'

function createId(prefix) {
  const randomId = window.crypto?.randomUUID?.()
  if (randomId) return `${prefix}_${randomId}`
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function ensureStorageId(storage, key, prefix) {
  const existing = storage.getItem(key)
  if (existing) return existing

  const nextValue = createId(prefix)
  storage.setItem(key, nextValue)
  return nextValue
}

function isTrackablePath(pathname) {
  const currentPath = String(pathname || '').trim()
  return Boolean(currentPath)
}

export default function SiteVisitTracker() {
  const location = useLocation()

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    if (!isTrackablePath(location.pathname)) return undefined

    try {
      const visitState = window.sessionStorage.getItem(TRACKING_STATE_KEY)
      if (visitState === 'tracking' || visitState === 'done') {
        return undefined
      }

      const visitorId = ensureStorageId(window.localStorage, VISITOR_ID_KEY, 'visitor')
      const sessionId = ensureStorageId(window.sessionStorage, SESSION_ID_KEY, 'session')
      const currentPath = `${location.pathname}${location.search || ''}`
      const referrer = document.referrer || ''

      window.sessionStorage.setItem(TRACKING_STATE_KEY, 'tracking')

      fetch(`${API_URL}/analytics/visit`, {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders(
          {
            'Content-Type': 'application/json',
          },
          'POST',
        ),
        body: JSON.stringify({
          visitorId,
          sessionId,
          path: currentPath,
          referrer,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Visit tracking failed with status ${response.status}`)
          }
          window.sessionStorage.setItem(TRACKING_STATE_KEY, 'done')
        })
        .catch(() => {
          window.sessionStorage.removeItem(TRACKING_STATE_KEY)
        })
    } catch (_) {
      return undefined
    }
  }, [location.pathname, location.search])

  return null
}
