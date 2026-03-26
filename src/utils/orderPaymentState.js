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

  let verifiedPayment = null
  try {
    const verifyResponse = await apiFetch(`/payments/verify/${normalizedOrderId}`)
    verifiedPayment = normalizePaymentResponse(verifyResponse)
  } catch (error) {
    if (error?.status !== 404) throw error
  }

  const orderResponse = await apiFetch(`/orders/${normalizedOrderId}`)
  const order = normalizeOrderResponse(orderResponse)
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

