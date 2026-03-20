// Service Worker - Jolof'Era PWA (cache + push)
const CACHE_NAME = 'jolofera-v2'
const SHELL = ['/', '/brand/logo-icon.png', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api') || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          return res
        })
        .catch(() => caches.match('/'))
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(request, clone))
        }
        return res
      })
    })
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: "Jolof'Era", body: event.data.text() }
  }

  const { title, body, url, icon } = payload

  event.waitUntil(
    self.registration.showNotification(title || "Jolof'Era", {
      body: body || '',
      icon: icon || '/brand/logo-icon.png',
      badge: '/brand/logo-icon.png',
      data: { url: url || '/' },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})

