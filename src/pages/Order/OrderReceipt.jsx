import { useLocation, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiCheck, FiShoppingBag, FiMapPin, FiTruck, FiHome, FiCopy, FiArrowRight } from 'react-icons/fi'
import { formatPrice } from '../../utils/helpers'
import { resolveMediaUrl } from '../../utils/media'
import { useEffect, useState } from 'react'
import { readOrderPaymentSession } from '../../utils/orderPaymentSession'
import apiFetch from '../../api/client'
import { loadOrderPaymentState } from '../../utils/orderPaymentState'
import toast from 'react-hot-toast'

const paymentLabels = {
  DEXPAY: { name: 'DexPay', icon: 'DX' },
  PAYTECH: { name: 'DexPay', icon: 'DX' },
  PAYDUNYA: { name: 'DexPay', icon: 'DX' },
  ORANGE_MONEY: { name: 'Orange Money', icon: 'OM' },
  WAVE: { name: 'Wave', icon: 'WV' },
  FREE_MONEY: { name: 'Free Money', icon: 'FM' },
  PAY_ON_PICKUP: { name: 'Paiement au retrait', icon: 'PICK' },
  CASH_ON_DELIVERY: { name: 'Paiement a la livraison', icon: 'COD' },
  CASH: { name: 'Especes / Cash', icon: 'CASH' },
}

function OrderReceipt() {
  const location = useLocation()
  const navigate = useNavigate()
  const seedData = location.state || readOrderPaymentSession()
  const searchParams = new URLSearchParams(location.search)
  const fallbackOrderId = searchParams.get('orderId') || seedData?.order?.id || ''

  const [copied, setCopied] = useState(false)
  const [receiptData, setReceiptData] = useState(seedData)
  const [orderStatus, setOrderStatus] = useState(seedData?.order?.status || 'PENDING')
  const [paymentStatus, setPaymentStatus] = useState(seedData?.order?.payment?.status || '')
  const [cancelling, setCancelling] = useState(false)
  const [loadingState, setLoadingState] = useState(false)

  useEffect(() => {
    if (!seedData && !fallbackOrderId) {
      navigate('/dashboard?tab=orders', { replace: true })
    }
  }, [fallbackOrderId, navigate, seedData])

  useEffect(() => {
    let mounted = true

    const syncOrderState = async () => {
      const orderId = fallbackOrderId
      if (!orderId) return

      setLoadingState(true)
      try {
        const { order, payment } = await loadOrderPaymentState(orderId)
        if (!mounted || !order) return

        setReceiptData((prev) => ({
          ...prev,
          order: {
            ...(prev?.order || {}),
            ...order,
            items: order.items || prev?.order?.items || [],
            payment: payment || order.payment || prev?.order?.payment || null,
          },
          salon: order.salon
            ? {
                ...(prev?.salon || {}),
                ...order.salon,
              }
            : (prev?.salon || null),
          paymentMethod: payment?.method || order.paymentMethod || prev?.paymentMethod || null,
          deliveryMode: order.deliveryMode || prev?.deliveryMode || 'PICKUP',
          deliveryAddress: order.deliveryAddress ?? prev?.deliveryAddress ?? '',
          grandTotal: prev?.grandTotal ?? order.totalPrice ?? 0,
          deliveryFee: prev?.deliveryFee ?? 0,
        }))
        setOrderStatus(order.status || 'PENDING')
        setPaymentStatus(payment?.status || order.payment?.status || '')
      } catch (_) {
        if (!mounted) return
      } finally {
        if (mounted) setLoadingState(false)
      }
    }

    syncOrderState()
    return () => {
      mounted = false
    }
  }, [fallbackOrderId])

  if (!receiptData && loadingState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gold-50/20 py-10 px-4">
        <div className="max-w-xl mx-auto rounded-3xl border border-primary-100 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
          <p className="text-primary-600">Chargement du recu...</p>
        </div>
      </div>
    )
  }

  if (!receiptData) return null

  const { order, salon, paymentMethod, deliveryMode, deliveryAddress, grandTotal, deliveryFee } = receiptData
  const items = order?.items || []
  const orderRef = order?.id
    ? `SF-${String(order.id).slice(-8).toUpperCase()}`
    : `SF-${Date.now().toString(36).toUpperCase()}`
  const orderDate = order?.createdAt ? new Date(order.createdAt) : new Date()
  const paymentKey = String(paymentMethod || order?.paymentMethod || '').toUpperCase()
  const pm = paymentLabels[paymentKey] || paymentLabels.CASH_ON_DELIVERY
  const isPendingPayment = String(orderStatus || '').toUpperCase() === 'PENDING_PAYMENT'
  const isDisputed = String(orderStatus || '').toUpperCase() === 'DISPUTED'
  const isPaymentCompleted = String(paymentStatus || '').toUpperCase() === 'COMPLETED'
  const isDexPayFlow = ['DEXPAY', 'PAYTECH', 'PAYDUNYA'].includes(paymentKey)
  const isDexPayPending = isDexPayFlow && isPendingPayment && String(paymentStatus || '').toUpperCase() !== 'COMPLETED'
  const isConfirmedOrder = ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'].includes(String(orderStatus || '').toUpperCase())
  const canCancel = order?.id && ['PENDING', 'PENDING_PAYMENT', 'DISPUTED', 'CONFIRMED'].includes(String(orderStatus || '').toUpperCase())
  const receiptTitle = isConfirmedOrder || isPaymentCompleted ? 'Recu de commande' : 'Suivi de commande'
  const headerIconClass = isDisputed
    ? 'bg-red-500 shadow-lg shadow-red-500/30'
    : isDexPayPending || (isPendingPayment && !isPaymentCompleted)
      ? 'bg-amber-500 shadow-lg shadow-amber-500/30'
      : 'bg-green-500 shadow-lg shadow-green-500/30'

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gold-50/20 py-4 sm:py-8">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex flex-col items-center mb-5 sm:mb-8"
        >
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${headerIconClass}`}>
            <FiCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-primary-900">
            {isDisputed
              ? 'Commande en litige de paiement'
              : (isDexPayPending
                  ? 'Confirmation DexPay en cours'
                  : (isPaymentCompleted ? 'Commande payee' : (isPendingPayment ? 'Commande en attente de validation' : 'Commande confirmee !')))}
          </h1>
          <p className="text-primary-500 mt-1">
            {isDisputed
              ? 'Le paiement est en cours de verification administrative.'
              : (isDexPayPending
                  ? 'Nous attendons la confirmation finale de DexPay pour cette commande.'
                  : (isPaymentCompleted ? 'Le paiement est confirme. Le traitement de la commande continue normalement.' : (isPendingPayment ? 'Votre paiement sera verifie par la boutique.' : 'Merci pour votre achat')))}
          </p>
          {loadingState ? <p className="text-xs text-primary-400 mt-2">Synchronisation du statut...</p> : null}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-primary-100 shadow-lg overflow-hidden"
        >
          <div className="bg-primary-900 text-white p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-primary-400 uppercase tracking-wider">{receiptTitle}</p>
                <p className="text-lg font-bold mt-1">{salon?.name || 'Boutique'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-primary-400">Reference</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-lg font-mono font-bold">{orderRef}</p>
                  <button onClick={handleCopyRef} className="p-1.5 rounded-lg hover:bg-white/10 transition" title="Copier">
                    {copied ? <FiCheck className="w-4 h-4 text-green-400" /> : <FiCopy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-4 text-sm text-primary-300">
              <span>{orderDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span>{orderDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <h3 className="font-bold text-primary-900 mb-3 flex items-center gap-2">
              <FiShoppingBag className="w-4 h-4" /> Articles commandes
            </h3>
            <div className="space-y-3">
              {items.map((c, idx) => {
                const product = c.product || c
                const img = resolveMediaUrl(product.imageUrl || product.image)
                return (
                  <div key={product.id || idx} className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
                    {img ? (
                      <img src={img} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary-200 flex items-center justify-center text-primary-400 text-xs">IMG</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-primary-900 truncate">{product.name}</p>
                      <div className="flex gap-2 text-xs text-primary-500">
                        <span>Qte: {c.quantity}</span>
                        {c.selectedSize && <span>- Taille: {c.selectedSize}</span>}
                        {c.selectedColor && <span>- Couleur: {c.selectedColor}</span>}
                      </div>
                    </div>
                    <p className="font-semibold text-primary-900">{formatPrice(product.price * c.quantity)}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mx-6 border-t border-dashed border-primary-200" />

          <div className="p-4 sm:p-6 space-y-2">
            <div className="flex justify-between text-sm text-primary-600">
              <span>Sous-total</span>
              <span>{formatPrice(items.reduce((s, c) => s + (c.product || c).price * c.quantity, 0))}</span>
            </div>
            <div className="flex justify-between text-sm text-primary-600">
              <span>Frais de livraison</span>
              <span>{deliveryFee > 0 ? formatPrice(deliveryFee) : 'Gratuit'}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t border-primary-200 pt-3 mt-2">
              <span>Total</span>
              <span className="text-gold-600">{formatPrice(grandTotal)}</span>
            </div>
          </div>

          <div className="mx-6 border-t border-dashed border-primary-200" />

          <div className="p-4 sm:p-6 grid sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h4 className="font-bold text-primary-900 mb-2 flex items-center gap-2">
                {deliveryMode === 'DELIVERY' ? <FiTruck className="w-4 h-4" /> : <FiHome className="w-4 h-4" />}
                {deliveryMode === 'DELIVERY' ? 'Livraison' : 'Retrait en boutique'}
              </h4>
              {deliveryMode === 'DELIVERY' && deliveryAddress ? (
                <p className="text-sm text-primary-600 flex items-start gap-1.5">
                  <FiMapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  {deliveryAddress}
                </p>
              ) : (
                <p className="text-sm text-primary-600">{salon?.address || 'Adresse de la boutique'}</p>
              )}
            </div>
            <div>
              <h4 className="font-bold text-primary-900 mb-2">Paiement</h4>
              <div className="flex items-center gap-2 text-sm text-primary-600">
                <span className="text-xs font-semibold text-primary-700 bg-primary-100 rounded-full px-2.5 py-1">{pm.icon}</span>
                <span>{pm.name}</span>
              </div>
              {paymentKey === 'CASH_ON_DELIVERY' ? (
                <p className="text-xs text-gold-600 font-medium mt-2 bg-gold-50 px-3 py-1.5 rounded-lg">
                  Preparez le montant exact si possible
                </p>
              ) : (paymentKey === 'DEXPAY' || paymentKey === 'PAYTECH' || paymentKey === 'PAYDUNYA') ? (
                <p className={`text-xs font-medium mt-2 px-3 py-1.5 rounded-lg ${
                  String(paymentStatus || '').toUpperCase() === 'COMPLETED'
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-amber-700 bg-amber-50'
                }`}>
                  {String(paymentStatus || '').toUpperCase() === 'COMPLETED'
                    ? 'Paiement DexPay confirme pour cette commande'
                    : 'Paiement DexPay en cours de confirmation'}
                </p>
              ) : ['ORANGE_MONEY', 'WAVE', 'FREE_MONEY'].includes(paymentKey) ? (
                <p className="text-xs text-blue-700 font-medium mt-2 bg-blue-50 px-3 py-1.5 rounded-lg">
                  {isDisputed
                    ? 'Paiement conteste par la boutique. Verification admin en cours.'
                    : 'Preuve de paiement envoyee. Validation en cours par la boutique.'}
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
            to="/dashboard?tab=orders"
            className="flex-1 py-3.5 text-center rounded-xl border border-primary-200 font-semibold text-primary-700 hover:bg-primary-50 transition"
          >
            Mes commandes
          </Link>
          <Link
            to="/salons?businessType=BOUTIQUE"
            className="flex-1 py-3.5 text-center rounded-xl bg-primary-900 text-white font-semibold hover:bg-primary-800 transition flex items-center justify-center gap-2"
          >
            Continuer mes achats <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default OrderReceipt
