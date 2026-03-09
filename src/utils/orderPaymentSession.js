const ORDER_PAYMENT_SESSION_KEY = 'flashrv_order_payment_session'

export function saveOrderPaymentSession(payload) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(
    ORDER_PAYMENT_SESSION_KEY,
    JSON.stringify({
      ...payload,
      updatedAt: new Date().toISOString(),
    })
  )
}

export function readOrderPaymentSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(ORDER_PAYMENT_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearOrderPaymentSession() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(ORDER_PAYMENT_SESSION_KEY)
}
