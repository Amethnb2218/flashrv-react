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

  const paymentMethod = String(order?.payment?.method || order?.paymentMethod || '').toUpperCase()
  const orderStatus = String(order?.status || '').toUpperCase()
  const shouldVerifyHostedPayment =
    ['DEXPAY', 'PAYTECH', 'PAYDUNYA'].includes(paymentMethod) ||
    ['PENDING_PAYMENT', 'CONFIRMED'].includes(orderStatus)

  let verifiedPayment = null
  if (shouldVerifyHostedPayment) {
    try {
      const verifyResponse = await apiFetch(`/payments/verify/${normalizedOrderId}`)
      verifiedPayment = normalizePaymentResponse(verifyResponse)
    } catch (error) {
      if (error?.status !== 404) throw error
    }
  }
  const payment = verifiedPayment || order?.payment || null

  return {
    order: order
      ? {
          ...order,
          payment,
        }
      : null,
    payment,
  }
}
