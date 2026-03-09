import apiFetch, { isRetryableHttpError } from '../api/client';

const PUSH_AUTO_SUBSCRIBE_ENABLED = String(import.meta.env.VITE_ENABLE_PUSH_SUBSCRIPTION ?? 'false').toLowerCase() === 'true';
const VAPID_PUBLIC_KEY_CACHE = 'flashrv_vapid_public_key';
const VAPID_RETRY_AFTER_CACHE = 'flashrv_vapid_retry_after';
const VAPID_RETRY_COOLDOWN_MS = 10 * 60 * 1000;

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_) {
    // noop
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (_) {
    // noop
  }
}

async function getVapidPublicKey() {
  const retryAfter = Number(readStorage(VAPID_RETRY_AFTER_CACHE) || 0);
  if (retryAfter > Date.now()) {
    return '';
  }

  const cached = String(readStorage(VAPID_PUBLIC_KEY_CACHE) || '').trim();
  if (cached) {
    return cached;
  }

  try {
    const res = await apiFetch('/push/vapid-public-key', { timeoutMs: 10000 });
    const key = String(res?.key || '').trim();
    if (!key) return '';
    writeStorage(VAPID_PUBLIC_KEY_CACHE, key);
    removeStorage(VAPID_RETRY_AFTER_CACHE);
    return key;
  } catch (err) {
    if (isRetryableHttpError(err) || Number(err?.status) === 503) {
      writeStorage(VAPID_RETRY_AFTER_CACHE, String(Date.now() + VAPID_RETRY_COOLDOWN_MS));
    }
    return '';
  }
}

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
    if (!PUSH_AUTO_SUBSCRIBE_ENABLED) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Check permission
    const permission = Notification.permission;
    if (permission === 'denied') return;

    // Request permission if not yet granted
    if (permission === 'default') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') return;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw-push.js');
    await navigator.serviceWorker.ready;

    // Get VAPID public key from backend
    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) return;

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
