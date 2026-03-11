import { Link, useLocation } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi'
import apiFetch from '../../api/client'
import { buildPaydunyaPaymentPayload } from '../../utils/payments'
import { readOrderPaymentSession } from '../../utils/orderPaymentSession'

function OrderPaymentCancel() {
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const sessionData = readOrderPaymentSession()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const orderId = searchParams.get('orderId') || sessionData?.order?.id || ''

  const handleRetry = async () => {
    if (!sessionData?.order?.id) {
      setError('Impossible de retrouver les informations de commande pour relancer le paiement.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await apiFetch('/payments/create', {
        method: 'POST',
        body: buildPaydunyaPaymentPayload({
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
        }),
      })

      const payload = result?.data || result
      if (!payload?.invoiceUrl) {
        throw new Error('Erreur lors de la creation de la facture PayDunya')
      }

      window.location.href = payload.invoiceUrl
    } catch (err) {
      setError(err.message || 'Impossible de relancer le paiement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gold-50 via-white to-rose-50/20 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl border border-gold-100 overflow-hidden"
        >
          <div className="px-6 py-8 bg-gradient-to-r from-gold-500 to-orange-500 text-white text-center">
            <FiAlertCircle className="w-14 h-14 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Paiement interrompu</h1>
            <p className="text-gold-50 mt-2">
              Votre commande est conservee. Vous pouvez relancer le paiement PayDunya.
            </p>
          </div>

          <div className="p-6 space-y-5">
            <div className="rounded-2xl bg-primary-50 border border-primary-100 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-primary-500 mb-1">Commande</p>
              <p className="text-lg font-bold text-primary-900">{orderId || 'Reference indisponible'}</p>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={handleRetry}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-900 text-white font-semibold hover:bg-primary-800 transition disabled:opacity-60"
              >
                <FiRefreshCw className="w-4 h-4" />
                {loading ? 'Redirection...' : 'Relancer PayDunya'}
              </button>
              <Link
                to="/order/receipt"
                state={sessionData || undefined}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-primary-300 text-primary-700 font-semibold hover:bg-primary-50 transition"
              >
                Voir le recu
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default OrderPaymentCancel
