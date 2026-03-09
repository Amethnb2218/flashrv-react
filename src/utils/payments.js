function sanitizeDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function buildFallbackEmail({ bookingId, customerPhone }) {
  const digits = sanitizeDigits(customerPhone)
  const suffix = digits || String(bookingId || 'client').replace(/[^a-zA-Z0-9_-]/g, '')
  return `client-${suffix}@flashrv.app`
}

export function buildPaydunyaPaymentPayload({
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
  const safeName = String(customerName || '').trim() || 'Client FlashRV'
  const safeEmail = String(customerEmail || '').trim() || buildFallbackEmail({ bookingId: safeBookingId, customerPhone })
  const safePhone = String(customerPhone || '').trim()
  const safeServiceLabel = String(serviceLabel || '').trim() || 'Reservation FlashRV'
  const safeSalonName = String(salonName || '').trim() || 'FlashRV'
  const numericAmount = Math.max(1, Number(amount || 0))
  const isOrderTarget = String(resourceKey || '').trim().toLowerCase() === 'orderid'

  return {
    bookingId: safeBookingId,
    appointmentId: safeBookingId,
    ...(isOrderTarget ? { orderId: safeBookingId } : {}),
    amount: numericAmount,
    currency: 'XOF',
    provider: 'PAYDUNYA',
    paymentMethod: 'PAYDUNYA',
    customerName: safeName,
    customerEmail: safeEmail,
    customerPhone: safePhone,
    description: `${safeServiceLabel} - ${safeSalonName}`,
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
      customerPhone: safePhone || null,
      customerEmailProvided: Boolean(String(customerEmail || '').trim()),
    },
  }
}
