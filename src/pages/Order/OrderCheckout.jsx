import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiChevronLeft, FiMapPin, FiPhone, FiUser, FiFileText, FiCheck, FiShoppingBag, FiTruck, FiHome, FiTrash2 } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { formatPrice } from '../../utils/helpers'
import { resolveMediaUrl } from '../../utils/media'
import apiFetch from '../../api/client'
import { pushSiteNotification } from '../../utils/siteNotifications'
import { clearCart, deriveDeliveryConfigFromItems, readCart, removeItemFromCart } from '../../utils/cartStore'
import { buildPaydunyaPaymentPayload } from '../../utils/payments'
import { saveOrderPaymentSession } from '../../utils/orderPaymentSession'

const PAYMENT_METHODS = [
  { id: 'paydunya', name: 'PayDunya', icon: 'PD', color: 'amber', description: 'Paiement en ligne securise (Orange, Free, Carte bancaire)' },
  { id: 'pay_on_pickup', name: 'Paiement au retrait', icon: 'PICK', color: 'gray', description: 'Reglez en boutique au moment du retrait' },
  { id: 'cash_on_delivery', name: 'Paiement a la livraison', icon: 'COD', color: 'gray', description: 'Payez en especes a la reception' },
]

const STEPS = ['Récapitulatif', 'Livraison', 'Paiement']

function OrderCheckout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()

  const storageCart = readCart()
  const orderSeed =
    location.state ||
    (Array.isArray(storageCart?.items) && storageCart.items.length > 0 && storageCart?.salon?.id
      ? {
          cart: storageCart.items,
          salon: storageCart.salon,
          deliveryMode: 'PICKUP',
          deliveryAddress: '',
          clientPhone: user?.phoneNumber || user?.phone || '',
          clientName: user?.name || '',
          notes: '',
        }
      : null)
  const [cart, setCart] = useState(() => orderSeed?.cart || [])
  const salon = orderSeed?.salon || null
  const deliveryConfig = deriveDeliveryConfigFromItems(cart)
  const baseDeliveryFee = Number(orderSeed?.minDeliveryFee ?? deliveryConfig.minDeliveryFee ?? 0)
  const forcePickup = Boolean(orderSeed?.forcePickup) || !deliveryConfig.canDeliverAll
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    deliveryMode: forcePickup ? 'PICKUP' : (orderSeed?.deliveryMode || 'PICKUP'),
    deliveryAddress: orderSeed?.deliveryAddress || '',
    clientPhone: orderSeed?.clientPhone || user?.phoneNumber || user?.phone || '',
    clientName: orderSeed?.clientName || user?.name || '',
    notes: orderSeed?.notes || '',
  })

  useEffect(() => {
    if (!salon) {
      navigate('/salons')
    }
  }, [salon, navigate])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
    }
  }, [isAuthenticated, navigate, location])

  useEffect(() => {
    if (forcePickup && form.deliveryMode !== 'PICKUP') {
      setForm((prev) => ({ ...prev, deliveryMode: 'PICKUP' }))
    }
  }, [forcePickup, form.deliveryMode])

  useEffect(() => {
    if (cart.length === 0) {
      navigate('/cart', { replace: true })
    }
  }, [cart.length, navigate])

  if (!salon || cart.length === 0) return null

  const cartTotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0)
  const deliveryFee = form.deliveryMode === 'DELIVERY' ? baseDeliveryFee : 0
  const grandTotal = cartTotal + deliveryFee

  const handleRemoveLine = (item) => {
    const nextCart = removeItemFromCart({
      productId: item.product.id,
      selectedSize: item.selectedSize || null,
      selectedColor: item.selectedColor || null,
      quantity: item.quantity,
    })

    setCart(nextCart.items || [])
  }

  const canProceed = () => {
    if (currentStep === 0) return cart.length > 0
    if (currentStep === 1) {
      if (!form.clientName.trim() || !form.clientPhone.trim()) return false
      if (form.deliveryMode === 'DELIVERY' && !form.deliveryAddress.trim()) return false
      return true
    }
    if (currentStep === 2) return selectedPayment !== null
    return false
  }

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmitOrder()
    }
  }

  const handleSubmitOrder = async () => {
    setSubmitting(true)
    setError('')
    let createdOrder = null
    let receiptPayload = null
    try {
      const variantNotes = cart
        .map((c) => {
          const parts = []
          if (c.selectedSize) parts.push(`Taille ${c.selectedSize}`)
          if (c.selectedColor) parts.push(`Couleur ${c.selectedColor}`)
          if (parts.length === 0) return null
          return `- ${c.product.name} x${c.quantity}: ${parts.join(', ')}`
        })
        .filter(Boolean)
      const mergedNotes = [form.notes?.trim(), variantNotes.length > 0 ? `Variantes:
${variantNotes.join('\n')}` : '']
        .filter(Boolean)
        .join('\n\n')

      const res = await apiFetch('/orders', {
        method: 'POST',
        body: {
          salonId: salon.id,
          items: cart.map(c => ({
            productId: c.product.id,
            quantity: c.quantity,
            ...(c.selectedSize ? { size: c.selectedSize } : {}),
            ...(c.selectedColor ? { color: c.selectedColor } : {}),
          })),
          deliveryMode: form.deliveryMode,
          deliveryAddress: form.deliveryMode === 'DELIVERY' ? form.deliveryAddress : undefined,
          clientPhone: form.clientPhone || undefined,
          clientName: form.clientName || undefined,
          notes: mergedNotes || undefined,
          paymentMethod: selectedPayment,
        }
      })
      const order = res?.data?.order || res?.order || res?.data || res
      createdOrder = order
      receiptPayload = {
        order: {
          ...order,
          clientName: form.clientName || '',
          clientPhone: form.clientPhone || '',
          items: cart.map((c) => ({
            ...(c.product || {}),
            product: c.product,
            quantity: c.quantity,
            selectedSize: c.selectedSize || null,
            selectedColor: c.selectedColor || null,
          })),
        },
        salon,
        paymentMethod: selectedPayment,
        deliveryMode: form.deliveryMode,
        deliveryAddress: form.deliveryAddress,
        grandTotal,
        deliveryFee,
      }

      if (selectedPayment === 'paydunya') {
        saveOrderPaymentSession(receiptPayload)
        pushSiteNotification({
          userId: user?.id || user?.email,
          type: 'order_pending_payment',
          message: `Commande en attente de paiement chez ${salon.name}. Ref: ${order?.id || 'N/A'}`,
          meta: { orderId: order?.id, salonId: salon.id },
        })

        const paymentBody = buildPaydunyaPaymentPayload({
            bookingId: order?.id,
            amount: grandTotal,
            customerName: form.clientName || user?.name || '',
            customerEmail: user?.email || '',
            customerPhone: form.clientPhone || user?.phoneNumber || user?.phone || '',
            salonName: salon?.name,
            serviceLabel: cart.map((item) => `${item.product?.name} x${item.quantity}`).join(', '),
            successPath: '/order/payment/success',
            cancelPath: '/order/payment/cancel',
            resourceKey: 'orderId',
          })

        let paymentResult
        for (let attempt = 0; attempt <= 2; attempt++) {
          try {
            paymentResult = await apiFetch('/payments/create', {
              method: 'POST',
              timeoutMs: 35000,
              body: paymentBody,
            })
            break
          } catch (retryErr) {
            const isRetryable = [0, 502, 503, 504].includes(retryErr?.status)
            if (!isRetryable || attempt === 2) throw retryErr
            await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
          }
        }

        const paymentPayload = paymentResult?.data || paymentResult
        if (!paymentPayload?.invoiceUrl) {
          throw new Error('Erreur lors de la creation de la facture PayDunya')
        }

        clearCart()
        window.location.href = paymentPayload.invoiceUrl
        return
      }

      pushSiteNotification({
        userId: user?.id || user?.email,
        type: 'order_confirmation',
        message: `Commande confirmee chez ${salon.name}. Ref: ${order?.id || 'N/A'}`,
        meta: { orderId: order?.id, salonId: salon.id },
      })

      navigate('/order/receipt', {
        state: receiptPayload,
        replace: true,
      })
      clearCart()
    } catch (e) {
      if (selectedPayment === 'paydunya' && createdOrder?.id && receiptPayload) {
        saveOrderPaymentSession(receiptPayload)
        navigate(`/order/payment/cancel?orderId=${encodeURIComponent(createdOrder.id)}`, { replace: true })
        return
      }
      setError(e.message || 'Erreur lors de la commande')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gold-50/20 py-6">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : navigate(-1)} className="w-10 h-10 rounded-xl border border-primary-200 flex items-center justify-center hover:bg-primary-50 transition">
            <FiChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-primary-900">Finaliser la commande</h1>
            <p className="text-sm text-primary-500">{salon.name}</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < currentStep ? 'bg-green-500 text-white' :
                  i === currentStep ? 'bg-primary-900 text-white shadow-lg' :
                  'bg-primary-200 text-primary-500'
                }`}>
                  {i < currentStep ? <FiCheck className="w-5 h-5" /> : i + 1}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${i <= currentStep ? 'text-primary-900' : 'text-primary-400'}`}>{step}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 rounded ${i < currentStep ? 'bg-green-500' : 'bg-primary-200'}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        {/* Step 1: Récapitulatif */}
        {currentStep === 0 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="bg-white rounded-2xl border border-primary-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-primary-100">
                <h2 className="text-lg font-bold text-primary-900 flex items-center gap-2">
                  <FiShoppingBag className="w-5 h-5" /> Récapitulatif de la commande
                </h2>
              </div>
              <div className="divide-y divide-primary-50">
                {cart.map((c, idx) => {
                  const img = resolveMediaUrl(c.product.imageUrl || c.product.image)
                  return (
                    <div key={c.product.id || idx} className="flex items-center gap-4 p-4">
                      {img ? (
                        <img src={img} alt={c.product.name} className="w-16 h-16 rounded-xl object-cover bg-primary-50" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-primary-100 flex items-center justify-center text-primary-400 text-xs">Photo</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-primary-900 truncate">{c.product.name}</h3>
                        {c.selectedSize && <span className="text-xs text-primary-500 mr-2">Taille: {c.selectedSize}</span>}
                        {c.selectedColor && <span className="text-xs text-primary-500">Couleur: {c.selectedColor}</span>}
                        <p className="text-sm text-primary-500">Qté: {c.quantity}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="font-bold text-primary-900">{formatPrice(c.product.price * c.quantity)}</p>
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(c)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition"
                          aria-label={`Supprimer ${c.product.name} du panier`}
                          title="Supprimer l'article"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="p-5 bg-primary-50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-primary-600">Sous-total</span>
                  <span className="font-medium">{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-primary-600">Livraison</span>
                  <span className="font-medium">{form.deliveryMode === 'DELIVERY' ? formatPrice(deliveryFee) : 'Gratuit'}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-primary-200 pt-2">
                  <span>Total</span>
                  <span className="text-gold-600">{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Livraison */}
        {currentStep === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="bg-white rounded-2xl border border-primary-100 shadow-sm p-5 space-y-5">
              <h2 className="text-lg font-bold text-primary-900 flex items-center gap-2">
                <FiTruck className="w-5 h-5" /> Mode de livraison
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setForm(f => ({ ...f, deliveryMode: 'PICKUP' }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.deliveryMode === 'PICKUP'
                      ? 'border-primary-900 bg-primary-50'
                      : 'border-primary-200 hover:border-primary-300'
                  }`}
                >
                  <FiHome className="w-6 h-6 mb-2" />
                  <p className="font-semibold text-sm">Retrait en boutique</p>
                  <p className="text-xs text-primary-500 mt-1">Gratuit</p>
                </button>
                <button
                  onClick={() => {
                    if (forcePickup) return
                    setForm(f => ({ ...f, deliveryMode: 'DELIVERY' }))
                  }}
                  disabled={forcePickup}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.deliveryMode === 'DELIVERY'
                      ? 'border-primary-900 bg-primary-50'
                      : forcePickup
                        ? 'border-primary-100 bg-primary-50 text-primary-400 cursor-not-allowed'
                        : 'border-primary-200 hover:border-primary-300'
                  }`}
                >
                  <FiTruck className="w-6 h-6 mb-2" />
                  <p className="font-semibold text-sm">Livraison</p>
                  <p className="text-xs text-primary-500 mt-1">
                    {forcePickup ? 'Indisponible pour ce panier' : baseDeliveryFee > 0 ? `A partir de ${formatPrice(baseDeliveryFee)}` : 'Gratuit'}
                  </p>
                </button>
              </div>

              {deliveryConfig.deliveryZones.length > 0 && !forcePickup && (
                <p className="text-xs text-primary-500">
                  Zones de livraison: {deliveryConfig.deliveryZones.join(', ')}
                </p>
              )}
              {forcePickup && (
                <p className="text-xs text-gold-700 bg-gold-50 border border-gold-100 rounded-lg px-3 py-2">
                  Un ou plusieurs articles de ce panier sont en retrait uniquement.
                </p>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1.5">
                    <FiUser className="inline w-4 h-4 mr-1" /> Nom complet
                  </label>
                  <input
                    value={form.clientName}
                    onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                    className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none"
                    placeholder="Votre nom"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1.5">
                    <FiPhone className="inline w-4 h-4 mr-1" /> Téléphone
                  </label>
                  <input
                    value={form.clientPhone}
                    onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
                    className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none"
                    placeholder="77 123 45 67"
                  />
                </div>

                {form.deliveryMode === 'DELIVERY' && (
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1.5">
                      <FiMapPin className="inline w-4 h-4 mr-1" /> Adresse de livraison
                    </label>
                    <input
                      value={form.deliveryAddress}
                      onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))}
                      className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none"
                      placeholder="Quartier, rue, bâtiment..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1.5">
                    <FiFileText className="inline w-4 h-4 mr-1" /> Instructions spéciales (optionnel)
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none"
                    placeholder="Informations complémentaires..."
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Paiement */}
        {currentStep === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="bg-white rounded-2xl border border-primary-100 shadow-sm p-5 space-y-5">
              <h2 className="text-lg font-bold text-primary-900">Choisissez votre méthode de paiement</h2>

              <div className="space-y-3">
                {PAYMENT_METHODS.map(method => (
                  <button
                    key={method.id}
                    onClick={() => {
                      if (method.id === 'pay_on_pickup' && form.deliveryMode === 'DELIVERY') return
                      setSelectedPayment(method.id)
                    }}
                    disabled={method.id === 'pay_on_pickup' && form.deliveryMode === 'DELIVERY'}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      selectedPayment === method.id
                        ? 'border-primary-900 bg-primary-50 shadow-sm'
                        : 'border-primary-200 hover:border-primary-300'
                    }`}
                  >
                    <span className="text-xs font-semibold text-primary-700 bg-primary-100 rounded-full px-2.5 py-1">{method.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-primary-900">{method.name}</p>
                      <p className={`text-sm ${method.id === 'pay_on_pickup' && form.deliveryMode === 'DELIVERY' ? 'text-primary-400' : 'text-primary-500'}`}>
                        {method.id === 'pay_on_pickup' && form.deliveryMode === 'DELIVERY'
                          ? 'Indisponible pour les commandes en livraison'
                          : method.description}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPayment === method.id ? 'border-primary-900 bg-primary-900' : 'border-primary-300'
                    }`}>
                      {selectedPayment === method.id && <FiCheck className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                ))}
              </div>

              

              {/* Order Summary */}
              <div className="p-4 bg-primary-50 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-primary-600">Articles ({cart.reduce((s, c) => s + c.quantity, 0)})</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-primary-600">Livraison</span>
                    <span>{formatPrice(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-primary-200 pt-2">
                  <span>Total à payer</span>
                  <span className="text-gold-600">{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bottom CTA */}
        <div className="mt-6">
          <button
            onClick={handleNext}
            disabled={!canProceed() || submitting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-900 via-primary-800 to-primary-900 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Traitement...
              </span>
            ) : currentStep === 2 ? (
              `Confirmer la commande (${formatPrice(grandTotal)})`
            ) : (
              'Continuer'
            )}
          </button>
        </div>

        {/* Security note */}
        <p className="text-center text-xs text-primary-400 mt-4">
          🔒 Paiement sécurisé · Vos données sont protégées
        </p>
      </div>
    </div>
  )
}

export default OrderCheckout



