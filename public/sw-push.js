// Service Worker for Web Push Notifications — StyleFlow
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'StyleFlow', body: event.data.text() };
  }

  const { title, body, url, icon } = payload;

  event.waitUntil(
    self.registration.showNotification(title || 'StyleFlow', {
      body: body || '',
      icon: icon || '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: url || '/' },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
