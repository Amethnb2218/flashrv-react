const ORDER_PAYMENT_SESSION_KEY = 'flashrv_order_payment_session'

function readStorageValue(storage) {
  if (!storage) return null
  try {
    const raw = storage.getItem(ORDER_PAYMENT_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStorageValue(storage, payload) {
  if (!storage) return
  try {
    if (!payload) {
      storage.removeItem(ORDER_PAYMENT_SESSION_KEY)
      return
    }
    storage.setItem(ORDER_PAYMENT_SESSION_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage errors in payment resume flows.
  }
}

export function saveOrderPaymentSession(payload) {
  if (typeof window === 'undefined') return
  const nextPayload = {
    ...payload,
    updatedAt: new Date().toISOString(),
  }
  writeStorageValue(window.localStorage, nextPayload)
  writeStorageValue(window.sessionStorage, nextPayload)
}

export function readOrderPaymentSession() {
  if (typeof window === 'undefined') return null
  const localValue = readStorageValue(window.localStorage)
  if (localValue) return localValue

  const sessionValue = readStorageValue(window.sessionStorage)
  if (sessionValue) {
    writeStorageValue(window.localStorage, sessionValue)
  }
  return sessionValue
}

export function clearOrderPaymentSession() {
  if (typeof window === 'undefined') return
  writeStorageValue(window.localStorage, null)
  writeStorageValue(window.sessionStorage, null)
}
