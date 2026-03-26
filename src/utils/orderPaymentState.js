import apiFetch from '../api/client'

function normalizeOrderResponse(response) {
  return response?.data?.order || response?.order || response?.data || response || null
}

function normalizePaymentResponse(response) {
  return response?.data?.payment || response?.payment || response?.data || response || null
}

export async function loadOrderPaymentState(orderId) {
  const normalizedOrderId = String(orderId || '').trim()
  if (!normalizedOrderId) {
    return { order: null, payment: null }
  }

  const orderResponse = await apiFetch(`/orders/${normalizedOrderId}`)
  const order = normalizeOrderResponse(orderResponse)

  const payment = order?.payment || null
  const paymentMethod = String(payment?.method || order?.paymentMethod || '').toUpperCase()
  const hasPaymentRecord = Boolean(payment?.id)
  const shouldVerifyHostedPayment =
    hasPaymentRecord &&
    ['DEXPAY', 'PAYTECH', 'PAYDUNYA'].includes(paymentMethod)

  let verifiedPayment = null
  if (shouldVerifyHostedPayment) {
    try {
      const verifyResponse = await apiFetch(`/payments/verify/${normalizedOrderId}`)
      verifiedPayment = normalizePaymentResponse(verifyResponse)
    } catch (error) {
      if (![404, 408, 502, 503, 504].includes(Number(error?.status))) throw error
    }
  }
  const resolvedPayment = verifiedPayment || payment || null

  return {
    order: order
      ? {
          ...order,
          payment: resolvedPayment,
        }
      : null,
    payment: resolvedPayment,
  }
}
