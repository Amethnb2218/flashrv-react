import { useLocation, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiCheck, FiShoppingBag, FiMapPin, FiTruck, FiHome, FiCopy, FiArrowRight } from 'react-icons/fi'
import { formatPrice } from '../../utils/helpers'
import { resolveMediaUrl } from '../../utils/media'
import { useEffect, useState } from 'react'
import apiFetch from '../../api/client'
import toast from 'react-hot-toast'
import { readOrderPaymentSession } from '../../utils/orderPaymentSession'

const paymentLabels = {
  paydunya: { name: 'PayDunya', icon: 'PD' },
  pay_on_pickup: { name: 'Paiement au retrait', icon: 'PICK' },
  cash_on_delivery: { name: 'Paiement a la livraison', icon: 'COD' },
}

function OrderReceipt() {
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state || readOrderPaymentSession()

  const [copied, setCopied] = useState(false)
  const [orderStatus, setOrderStatus] = useState(data?.order?.status || 'PENDING')
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!data) navigate('/salons', { replace: true })
  }, [data, navigate])

  if (!data) return null

  const { order, salon, paymentMethod, deliveryMode, deliveryAddress, grandTotal, deliveryFee } = data
  const items = order?.items || []
  const orderRef = order?.id
    ? `SF-${String(order.id).slice(-8).toUpperCase()}`
    : `SF-${Date.now().toString(36).toUpperCase()}`
  const orderDate = order?.createdAt ? new Date(order.createdAt) : new Date()
  const pm = paymentLabels[paymentMethod] || paymentLabels.cash_on_delivery
  const canCancel = order?.id && ['PENDING', 'CONFIRMED'].includes(String(orderStatus || '').toUpperCase())

  const handleCopyRef = () => {
    navigator.clipboard.writeText(orderRef)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  const handleCancelOrder = async () => {
    if (!canCancel || !order?.id) return
    setCancelling(true)
    try {
      await apiFetch(`/orders/${order.id}/status`, { method: 'PATCH', body: { status: 'CANCELLED' } })
      setOrderStatus('CANCELLED')
      toast.success('Commande annulee')
    } catch (e) {
      toast.error(e.message || "Impossible d'annuler la commande")
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-amber-50/20 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30 mb-4">
            <FiCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Commande confirmee !</h1>
          <p className="text-gray-500 mt-1">Merci pour votre achat</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden"
        >
          <div className="bg-gray-900 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Recu de commande</p>
                <p className="text-lg font-bold mt-1">{salon?.name || 'Boutique'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Reference</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-lg font-mono font-bold">{orderRef}</p>
                  <button onClick={handleCopyRef} className="p-1.5 rounded-lg hover:bg-white/10 transition" title="Copier">
                    {copied ? <FiCheck className="w-4 h-4 text-green-400" /> : <FiCopy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-4 text-sm text-gray-300">
              <span>{orderDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span>{orderDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div className="p-6">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FiShoppingBag className="w-4 h-4" /> Articles commandes
            </h3>
            <div className="space-y-3">
              {items.map((c, idx) => {
                const product = c.product || c
                const img = resolveMediaUrl(product.imageUrl || product.image)
                return (
                  <div key={product.id || idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    {img ? (
                      <img src={img} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-xs">IMG</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{product.name}</p>
                      <div className="flex gap-2 text-xs text-gray-500">
                        <span>Qte: {c.quantity}</span>
                        {c.selectedSize && <span>- Taille: {c.selectedSize}</span>}
                        {c.selectedColor && <span>- Couleur: {c.selectedColor}</span>}
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">{formatPrice(product.price * c.quantity)}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mx-6 border-t border-dashed border-gray-200" />

          <div className="p-6 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Sous-total</span>
              <span>{formatPrice(items.reduce((s, c) => s + (c.product || c).price * c.quantity, 0))}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Frais de livraison</span>
              <span>{deliveryFee > 0 ? formatPrice(deliveryFee) : 'Gratuit'}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t border-gray-200 pt-3 mt-2">
              <span>Total</span>
              <span className="text-amber-600">{formatPrice(grandTotal)}</span>
            </div>
          </div>

          <div className="mx-6 border-t border-dashed border-gray-200" />

          <div className="p-6 grid sm:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                {deliveryMode === 'DELIVERY' ? <FiTruck className="w-4 h-4" /> : <FiHome className="w-4 h-4" />}
                {deliveryMode === 'DELIVERY' ? 'Livraison' : 'Retrait en boutique'}
              </h4>
              {deliveryMode === 'DELIVERY' && deliveryAddress ? (
                <p className="text-sm text-gray-600 flex items-start gap-1.5">
                  <FiMapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  {deliveryAddress}
                </p>
              ) : (
                <p className="text-sm text-gray-600">{salon?.address || 'Adresse de la boutique'}</p>
              )}
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Paiement</h4>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-xs font-semibold text-gray-700 bg-gray-100 rounded-full px-2.5 py-1">{pm.icon}</span>
                <span>{pm.name}</span>
              </div>
              {paymentMethod === 'cash_on_delivery' ? (
                <p className="text-xs text-amber-600 font-medium mt-2 bg-amber-50 px-3 py-1.5 rounded-lg">
                  Preparez le montant exact si possible
                </p>
              ) : paymentMethod === 'paydunya' ? (
                <p className="text-xs text-emerald-700 font-medium mt-2 bg-emerald-50 px-3 py-1.5 rounded-lg">
                  Paiement PayDunya initialise pour cette commande
                </p>
              ) : (
                <p className="text-xs text-blue-600 font-medium mt-2 bg-blue-50 px-3 py-1.5 rounded-lg">
                  Reglement prevu au moment du retrait en boutique
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {canCancel && (
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="flex-1 py-3.5 text-center rounded-xl border border-red-300 text-red-700 font-semibold hover:bg-red-50 transition disabled:opacity-60"
            >
              {cancelling ? 'Annulation...' : 'Annuler la commande'}
            </button>
          )}
          <Link
            to="/dashboard"
            className="flex-1 py-3.5 text-center rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Mes commandes
          </Link>
          <Link
            to="/salons?businessType=BOUTIQUE"
            className="flex-1 py-3.5 text-center rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2"
          >
            Continuer mes achats <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default OrderReceipt
