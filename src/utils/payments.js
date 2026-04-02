function sanitizeDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function buildFallbackEmail({ bookingId, customerPhone }) {
  const digits = sanitizeDigits(customerPhone)
  const suffix = digits || String(bookingId || 'client').replace(/[^a-zA-Z0-9_-]/g, '')
  return `client-${suffix}@jolofera.com`
}

export const DEXPAY_PLATFORM_FEE_RATE = 0.02

export function calculateDexPayPlatformFee(amount) {
  const baseAmount = Math.max(0, Number(amount || 0))
  return Math.round(baseAmount * DEXPAY_PLATFORM_FEE_RATE)
}

export function calculateDexPayTotal(amount) {
  const baseAmount = Math.max(0, Number(amount || 0))
  return baseAmount + calculateDexPayPlatformFee(baseAmount)
}

export function buildDexPayPaymentPayload({
  bookingId,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  salonName,
  serviceLabel,
  successPath,
  cancelPath,
  resourceKey = 'appointmentId',
}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const safeBookingId = String(bookingId || '').trim()
  const safeName = String(customerName || '').trim() || "Client Jolof'Era"
  const safeEmail = String(customerEmail || '').trim() || buildFallbackEmail({ bookingId: safeBookingId, customerPhone })
  const safePhone = String(customerPhone || '').trim()
  const safeServiceLabel = String(serviceLabel || '').trim() || "Reservation Jolof'Era"
  const safeSalonName = String(salonName || '').trim() || "Jolof'Era"
  const baseAmount = Math.max(1, Number(amount || 0))
  const platformFeeAmount = calculateDexPayPlatformFee(baseAmount)
  const numericAmount = calculateDexPayTotal(baseAmount)
  const isOrderTarget = String(resourceKey || '').trim().toLowerCase() === 'orderid'

  return {
    bookingId: safeBookingId,
    appointmentId: safeBookingId,
    ...(isOrderTarget ? { orderId: safeBookingId } : {}),
    amount: numericAmount,
    currency: 'XOF',
    provider: 'DEXPAY',
    paymentMethod: 'DEXPAY',
    customerName: safeName,
    customerEmail: safeEmail,
    customerPhone: safePhone,
    description: `${safeServiceLabel} - ${safeSalonName}`,
    baseAmount,
    platformFeeAmount,
    successUrl: origin && successPath
      ? `${origin}${successPath}?${resourceKey}=${encodeURIComponent(safeBookingId)}`
      : origin
        ? `${origin}/payment/success?${resourceKey}=${encodeURIComponent(safeBookingId)}`
        : undefined,
    cancelUrl: origin && cancelPath
      ? `${origin}${cancelPath}?${resourceKey}=${encodeURIComponent(safeBookingId)}`
      : origin
        ? `${origin}/payment/cancel?${resourceKey}=${encodeURIComponent(safeBookingId)}`
        : undefined,
    metadata: {
      bookingId: safeBookingId,
      salonName: safeSalonName,
      serviceLabel: safeServiceLabel,
      baseAmount,
      platformFeeAmount,
      customerPhone: safePhone || null,
      customerEmailProvided: Boolean(String(customerEmail || '').trim()),
    },
  }
}

export const buildPaytechPaymentPayload = buildDexPayPaymentPayload
export const buildPaydunyaPaymentPayload = buildDexPayPaymentPayload
