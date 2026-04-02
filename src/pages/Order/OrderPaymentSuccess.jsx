import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { FiArrowRight, FiCheckCircle, FiShoppingBag } from 'react-icons/fi'
import { clearCart } from '../../utils/cartStore'
import { readOrderPaymentSession } from '../../utils/orderPaymentSession'
import { loadOrderPaymentState } from '../../utils/orderPaymentState'

function OrderPaymentSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const sessionData = readOrderPaymentSession()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const orderId = searchParams.get('orderId') || sessionData?.order?.id || ''
  const [statusLabel, setStatusLabel] = useState('pending')
  const [message, setMessage] = useState('Nous verifions la confirmation du paiement DexPay.')

  useEffect(() => {
    clearCart()
  }, [])

  useEffect(() => {
    let mounted = true

    const syncOrderState = async () => {
      if (!orderId) {
        if (mounted) {
          setStatusLabel('confirmed')
          setMessage('Votre commande est enregistree. Vous pouvez consulter le recu.')
        }
        return
      }

      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          const { order, payment } = await loadOrderPaymentState(orderId)
          if (!mounted) return

          const orderStatus = String(order?.status || '').toUpperCase()
          const paymentStatus = String(payment?.status || '').toUpperCase()

          if (orderStatus === 'CONFIRMED' || paymentStatus === 'COMPLETED') {
            setStatusLabel('confirmed')
            setMessage('Votre paiement DexPay est confirme et la commande est bien enregistree.')
            return
          }

          setStatusLabel('pending')
          setMessage('Le paiement a ete recu. La confirmation finale DexPay est en cours.')
        } catch (_) {
          if (!mounted) return
          setStatusLabel('pending')
          setMessage('Le paiement est en cours de synchronisation. Le recu affichera le statut reel.')
        }

        await new Promise((resolve) => setTimeout(resolve, 1800))
      }
    }

    syncOrderState()
    return () => {
      mounted = false
    }
  }, [orderId])

  const heading = statusLabel === 'confirmed'
    ? 'Paiement DexPay confirme'
    : 'Confirmation DexPay en cours'
  const receiptLabel = statusLabel === 'confirmed' ? 'Voir le recu' : 'Voir la commande'

  return (
    <div className="app-page min-h-screen px-4 py-10">
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="app-panel overflow-hidden shadow-xl"
        >
          <div className="px-6 py-8 bg-gradient-to-r from-emerald-600 to-green-500 text-white text-center">
            <FiCheckCircle className="w-14 h-14 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">{heading}</h1>
            <p className="text-emerald-50 mt-2">{message}</p>
          </div>

          <div className="p-6 space-y-5">
            <div className="app-panel-muted p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-primary-500 mb-1">Commande</p>
              <p className="text-lg font-bold text-primary-900">{orderId || 'Reference en attente'}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => navigate(`/order/receipt?orderId=${encodeURIComponent(orderId || sessionData?.order?.id || '')}`, { state: sessionData || undefined, replace: true })}
                className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-3 font-semibold"
              >
                <FiShoppingBag className="w-4 h-4" />
                {receiptLabel}
              </button>
              <Link
                to="/dashboard?tab=orders"
                className="btn-secondary inline-flex items-center justify-center gap-2 px-4 py-3 font-semibold"
              >
                Mes commandes
                <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default OrderPaymentSuccess
