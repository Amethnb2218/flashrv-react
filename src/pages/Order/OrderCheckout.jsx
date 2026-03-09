import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiChevronLeft, FiMapPin, FiPhone, FiUser, FiFileText, FiCheck, FiShoppingBag, FiTruck, FiHome } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { formatPrice } from '../../utils/helpers'
import { resolveMediaUrl } from '../../utils/media'
import apiFetch from '../../api/client'
import { pushSiteNotification } from '../../utils/siteNotifications'

const PAYMENT_METHODS = [
  { id: 'pay_on_pickup', name: 'Paiement au retrait', icon: 'PICK', color: 'gray', description: 'Reglez en boutique au moment du retrait' },
  { id: 'cash_on_delivery', name: 'Paiement a la livraison', icon: 'COD', color: 'gray', description: 'Payez en especes a la reception' },
]

const STEPS = ['Récapitulatif', 'Livraison', 'Paiement']

function OrderCheckout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()

  const orderData = location.state
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    deliveryMode: orderData?.deliveryMode || 'PICKUP',
    deliveryAddress: orderData?.deliveryAddress || '',
    clientPhone: orderData?.clientPhone || user?.phoneNumber || user?.phone || '',
    clientName: orderData?.clientName || user?.name || '',
    notes: orderData?.notes || '',
  })

  useEffect(() => {
    if (!orderData?.cart || !orderData?.salon) {
      navigate('/salons')
    }
  }, [orderData, navigate])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
    }
  }, [isAuthenticated, navigate, location])

  if (!orderData?.cart || !orderData?.salon) return null

  const { cart, salon } = orderData
  const cartTotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0)
  const deliveryFee = form.deliveryMode === 'DELIVERY' ? 1000 : 0
  const grandTotal = cartTotal + deliveryFee

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
      const mergedNotes = [form.notes?.trim(), variantNotes.length > 0 ? `Variantes:\n${variantNotes.join('\n')}` : '']
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
      pushSiteNotification({
        userId: user?.id || user?.email,
        type: 'order_confirmation',
        message: `Commande confirmée chez ${salon.name}. Réf: ${order?.id || 'N/A'}`,
        meta: { orderId: order?.id, salonId: salon.id },
      })
      navigate('/order/receipt', {
        state: {
          order: {
            ...order,
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
        },
        replace: true,
      })
    } catch (e) {
      setError(e.message || 'Erreur lors de la commande')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/20 py-6">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : navigate(-1)} className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">
            <FiChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Finaliser la commande</h1>
            <p className="text-sm text-gray-500">{salon.name}</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < currentStep ? 'bg-green-500 text-white' :
                  i === currentStep ? 'bg-gray-900 text-white shadow-lg' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {i < currentStep ? <FiCheck className="w-5 h-5" /> : i + 1}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${i <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}>{step}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 rounded ${i < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FiShoppingBag className="w-5 h-5" /> Récapitulatif de la commande
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {cart.map((c, idx) => {
                  const img = resolveMediaUrl(c.product.imageUrl || c.product.image)
                  return (
                    <div key={c.product.id || idx} className="flex items-center gap-4 p-4">
                      {img ? (
                        <img src={img} alt={c.product.name} className="w-16 h-16 rounded-xl object-cover bg-gray-50" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs">Photo</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{c.product.name}</h3>
                        {c.selectedSize && <span className="text-xs text-gray-500 mr-2">Taille: {c.selectedSize}</span>}
                        {c.selectedColor && <span className="text-xs text-gray-500">Couleur: {c.selectedColor}</span>}
                        <p className="text-sm text-gray-500">Qté: {c.quantity}</p>
                      </div>
                      <p className="font-bold text-gray-900">{formatPrice(c.product.price * c.quantity)}</p>
                    </div>
                  )
                })}
              </div>
              <div className="p-5 bg-gray-50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sous-total</span>
                  <span className="font-medium">{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Livraison</span>
                  <span className="font-medium">{form.deliveryMode === 'DELIVERY' ? formatPrice(deliveryFee) : 'Gratuit'}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                  <span>Total</span>
                  <span className="text-amber-600">{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Livraison */}
        {currentStep === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiTruck className="w-5 h-5" /> Mode de livraison
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setForm(f => ({ ...f, deliveryMode: 'PICKUP' }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.deliveryMode === 'PICKUP'
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FiHome className="w-6 h-6 mb-2" />
                  <p className="font-semibold text-sm">Retrait en boutique</p>
                  <p className="text-xs text-gray-500 mt-1">Gratuit</p>
                </button>
                <button
                  onClick={() => setForm(f => ({ ...f, deliveryMode: 'DELIVERY' }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.deliveryMode === 'DELIVERY'
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FiTruck className="w-6 h-6 mb-2" />
                  <p className="font-semibold text-sm">Livraison</p>
                  <p className="text-xs text-gray-500 mt-1">{formatPrice(1000)}</p>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <FiUser className="inline w-4 h-4 mr-1" /> Nom complet
                  </label>
                  <input
                    value={form.clientName}
                    onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Votre nom"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <FiPhone className="inline w-4 h-4 mr-1" /> Téléphone
                  </label>
                  <input
                    value={form.clientPhone}
                    onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="77 123 45 67"
                  />
                </div>

                {form.deliveryMode === 'DELIVERY' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <FiMapPin className="inline w-4 h-4 mr-1" /> Adresse de livraison
                    </label>
                    <input
                      value={form.deliveryAddress}
                      onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                      placeholder="Quartier, rue, bâtiment..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <FiFileText className="inline w-4 h-4 mr-1" /> Instructions spéciales (optionnel)
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
              <h2 className="text-lg font-bold text-gray-900">Choisissez votre méthode de paiement</h2>

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
                        ? 'border-gray-900 bg-gray-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xs font-semibold text-gray-700 bg-gray-100 rounded-full px-2.5 py-1">{method.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{method.name}</p>
                      <p className={`text-sm ${method.id === 'pay_on_pickup' && form.deliveryMode === 'DELIVERY' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {method.id === 'pay_on_pickup' && form.deliveryMode === 'DELIVERY'
                          ? 'Indisponible pour les commandes en livraison'
                          : method.description}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPayment === method.id ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
                    }`}>
                      {selectedPayment === method.id && <FiCheck className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                ))}
              </div>

              

              {/* Order Summary */}
              <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Articles ({cart.reduce((s, c) => s + c.quantity, 0)})</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Livraison</span>
                    <span>{formatPrice(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2">
                  <span>Total à payer</span>
                  <span className="text-amber-600">{formatPrice(grandTotal)}</span>
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
            className="w-full py-4 rounded-xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        <p className="text-center text-xs text-gray-400 mt-4">
          🔒 Paiement sécurisé · Vos données sont protégées
        </p>
      </div>
    </div>
  )
}

export default OrderCheckout



