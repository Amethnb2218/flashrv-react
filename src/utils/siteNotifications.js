const STORAGE_KEY = 'flashrv_site_notifications_v1'
const NOTIF_EVENT = 'flashrv:notifications:updated'

const toArray = (value) => (Array.isArray(value) ? value : [])

const readAll = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return toArray(JSON.parse(raw))
  } catch {
    return []
  }
}

const writeAll = (list) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toArray(list)))
  window.dispatchEvent(new CustomEvent(NOTIF_EVENT))
}

const getUserKey = (userId) => String(userId || 'anonymous')

export const getSiteNotifications = (userId, limit = 30) => {
  const key = getUserKey(userId)
  return readAll()
    .filter((n) => String(n.userId || 'anonymous') === key)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}

export const pushSiteNotification = ({
  userId,
  message,
  type = 'info',
  meta = {},
}) => {
  if (!message) return null
  const notif = {
    id: `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    userId: getUserKey(userId),
    message: String(message),
    type,
    meta,
    isRead: false,
    createdAt: new Date().toISOString(),
  }
  const next = [notif, ...readAll()].slice(0, 200)
  writeAll(next)
  return notif
}

export const markSiteNotificationRead = (id, userId) => {
  const key = getUserKey(userId)
  const next = readAll().map((n) => {
    if (n.id !== id) return n
    if (String(n.userId || 'anonymous') !== key) return n
    return { ...n, isRead: true }
  })
  writeAll(next)
}

export const markAllSiteNotificationsRead = (userId) => {
  const key = getUserKey(userId)
  const next = readAll().map((n) =>
    String(n.userId || 'anonymous') === key ? { ...n, isRead: true } : n
  )
  writeAll(next)
}

export const subscribeSiteNotifications = (listener) => {
  if (typeof listener !== 'function') return () => {}
  const handler = () => listener()
  window.addEventListener(NOTIF_EVENT, handler)
  return () => window.removeEventListener(NOTIF_EVENT, handler)
}

