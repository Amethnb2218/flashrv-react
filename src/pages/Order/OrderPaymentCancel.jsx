import { Link, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi'
import apiFetch from '../../api/client'
import { buildDexPayPaymentPayload } from '../../utils/payments'
import { readOrderPaymentSession } from '../../utils/orderPaymentSession'
import { loadOrderPaymentState } from '../../utils/orderPaymentState'

function OrderPaymentCancel() {
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resolvedState, setResolvedState] = useState('idle')
  const sessionData = readOrderPaymentSession()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const orderId = searchParams.get('orderId') || sessionData?.order?.id || ''

  const wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs))

  const createInvoiceWithRetry = async (paymentPayload) => {
    const retryDelays = [0, 1500]
    let lastError = null

    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      if (retryDelays[attempt] > 0) {
        await wait(retryDelays[attempt])
      }

      try {
        return await apiFetch('/payments/create', {
          method: 'POST',
          timeoutMs: 50000,
          body: paymentPayload,
        })
      } catch (err) {
        lastError = err
        if (![0, 502, 503, 504, 408].includes(Number(err?.status)) || attempt === retryDelays.length - 1) {
          throw err
        }
      }
    }

    throw lastError || new Error('Impossible de relancer le paiement')
  }

  useEffect(() => {
    let mounted = true

    const checkActualStatus = async () => {
      if (!orderId) return
      try {
        const { order, payment } = await loadOrderPaymentState(orderId)
        if (!mounted) return
        const orderStatus = String(order?.status || '').toUpperCase()
        const paymentStatus = String(payment?.status || '').toUpperCase()
        if (orderStatus === 'CONFIRMED' || paymentStatus === 'COMPLETED') {
          setResolvedState('confirmed')
          setError('')
          return
        }
      } catch (_) {
        if (!mounted) return
      }
      if (mounted) setResolvedState('cancelled')
    }

    checkActualStatus()
    return () => {
      mounted = false
    }
  }, [orderId])

  const handleRetry = async () => {
    if (!sessionData?.order?.id) {
      setError('Impossible de retrouver les informations de commande pour relancer le paiement.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await createInvoiceWithRetry(
        buildDexPayPaymentPayload({
          bookingId: sessionData.order.id,
          amount: sessionData.grandTotal,
          customerName: sessionData.order?.clientName || '',
          customerEmail: '',
          customerPhone: sessionData.order?.clientPhone || '',
          salonName: sessionData.salon?.name,
          serviceLabel: (sessionData.order?.items || [])
            .map((item) => `${item.product?.name || item.name} x${item.quantity}`)
            .join(', '),
          successPath: '/order/payment/success',
          cancelPath: '/order/payment/cancel',
          resourceKey: 'orderId',
        })
      )

      const payload = result?.data || result
      if (!payload?.invoiceUrl) {
        throw new Error('Erreur lors de la creation de la session DexPay')
      }

      window.location.href = payload.invoiceUrl
    } catch (err) {
      setError(err.message || 'Impossible de relancer le paiement')
    } finally {
      setLoading(false)
    }
  }

  const isConfirmed = resolvedState === 'confirmed'
  const receiptLabel = isConfirmed ? 'Voir le recu' : 'Voir la commande'

  return (
    <div className="app-page min-h-screen px-4 py-10">
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="app-panel overflow-hidden shadow-xl"
        >
          <div className="px-6 py-8 bg-gradient-to-r from-gold-500 to-orange-500 text-white text-center">
            <FiAlertCircle className="w-14 h-14 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">{isConfirmed ? 'Paiement deja confirme' : 'Paiement interrompu'}</h1>
            <p className="text-gold-50 mt-2">
              {isConfirmed
                ? 'Le paiement a finalement ete confirme. Vous pouvez consulter le recu de commande.'
                : 'Votre commande est conservee. Vous pouvez relancer le paiement DexPay.'}
            </p>
          </div>

          <div className="p-6 space-y-5">
            <div className="app-panel-muted p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-primary-500 mb-1">Commande</p>
              <p className="text-lg font-bold text-primary-900">{orderId || 'Reference indisponible'}</p>
            </div>

            {error ? (
              <div className="border border-[#e7cfaf] bg-[#fff0ea] px-4 py-3 text-sm text-[#9d4f0d]">
                {error}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {isConfirmed ? (
                <Link
                  to={`/order/receipt?orderId=${encodeURIComponent(orderId || sessionData?.order?.id || '')}`}
                  state={sessionData || undefined}
                  className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-3 font-semibold"
                >
                  {receiptLabel}
                </Link>
              ) : (
                <button
                  onClick={handleRetry}
                  disabled={loading}
                  className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-3 font-semibold disabled:opacity-60"
                >
                  <FiRefreshCw className="w-4 h-4" />
                  {loading ? 'Redirection...' : 'Relancer DexPay'}
                </button>
              )}
              <Link
                to={`/order/receipt?orderId=${encodeURIComponent(orderId || sessionData?.order?.id || '')}`}
                state={sessionData || undefined}
                className="btn-secondary inline-flex items-center justify-center gap-2 px-4 py-3 font-semibold"
              >
                {receiptLabel}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default OrderPaymentCancel
