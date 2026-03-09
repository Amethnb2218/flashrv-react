import apiFetch from '../api/client';

/**
 * Convert a base64 URL-safe string to Uint8Array (for applicationServerKey).
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Subscribe the current browser to Web Push and send the subscription to the backend.
 * Should be called after login. Silently no-ops if push is unsupported or denied.
 */
export async function subscribeToPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Get VAPID public key from backend
    const res = await apiFetch('/push/vapid-public-key');
    const vapidKey = res?.key;
    if (!vapidKey) return;

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw-push.js');
    await navigator.serviceWorker.ready;

    // Check permission
    const permission = Notification.permission;
    if (permission === 'denied') return;

    // Request permission if not yet granted
    if (permission === 'default') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') return;
    }

    // Subscribe
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    // Send subscription to backend
    const subJSON = subscription.toJSON();
    await apiFetch('/push/subscribe', {
      method: 'POST',
      body: {
        endpoint: subJSON.endpoint,
        keys: {
          p256dh: subJSON.keys.p256dh,
          auth: subJSON.keys.auth,
        },
      },
    });
  } catch (err) {
    // Silently ignore push subscription errors when the backend push service is unavailable.
    void err
  }
}

/**
 * Unsubscribe from push notifications (called on logout).
 */
export async function unsubscribeFromPush() {
  try {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
    if (!registration) return;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    await apiFetch('/push/unsubscribe', {
      method: 'POST',
      body: { endpoint: subscription.endpoint },
    }).catch(() => {});

    await subscription.unsubscribe();
  } catch {
    // ignore
  }
}
