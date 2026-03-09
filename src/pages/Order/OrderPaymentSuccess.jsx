import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { FiArrowRight, FiCheckCircle, FiShoppingBag } from 'react-icons/fi'
import { readOrderPaymentSession } from '../../utils/orderPaymentSession'

function OrderPaymentSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const sessionData = readOrderPaymentSession()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const orderId = searchParams.get('orderId') || sessionData?.order?.id || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50/20 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden"
        >
          <div className="px-6 py-8 bg-gradient-to-r from-emerald-600 to-green-500 text-white text-center">
            <FiCheckCircle className="w-14 h-14 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Paiement PayDunya confirme</h1>
            <p className="text-emerald-50 mt-2">
              Votre commande est enregistree et votre paiement a ete initialise avec succes.
            </p>
          </div>

          <div className="p-6 space-y-5">
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">Commande</p>
              <p className="text-lg font-bold text-gray-900">{orderId || 'Reference en attente'}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => navigate('/order/receipt', { state: sessionData || undefined, replace: true })}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition"
              >
                <FiShoppingBag className="w-4 h-4" />
                Voir le recu
              </button>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
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
