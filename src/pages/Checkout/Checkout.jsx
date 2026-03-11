import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiChevronLeft, FiShoppingBag, FiMapPin, FiPhone, FiUser, FiTruck, FiHome, FiSmartphone, FiCheck, FiAlertCircle, FiPackage, FiFileText } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { formatPrice } from '../../utils/helpers'
import { resolveMediaUrl } from '../../utils/media'
import apiFetch from '../../api/client'
import LoadingSpinner from '../../components/UI/LoadingSpinner'

const PAYMENT_METHODS = [
  { id: 'pay_on_pickup', name: 'Paiement au retrait', icon: 'PICK', color: 'gray', desc: 'Reglez en boutique au retrait' },
  { id: 'cash_on_delivery', name: 'Paiement a la livraison', icon: 'COD', color: 'gray', desc: 'Payez en especes a la reception' },
]

function Checkout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()

  // Cart data passed from SalonDetail via navigate state
  const { cart = [], salon = null, orderForm: initialForm = {} } = location.state || {}

  const [deliveryMode, setDeliveryMode] = useState(initialForm.deliveryMode || 'PICKUP')
  const [deliveryAddress, setDeliveryAddress] = useState(initialForm.deliveryAddress || '')
  const [clientPhone, setClientPhone] = useState(initialForm.clientPhone || user?.phoneNumber || user?.phone || '')
  const [clientName, setClientName] = useState(initialForm.clientName || user?.name || '')
  const [notes, setNotes] = useState(initialForm.notes || '')
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1: review, 2: delivery, 3: payment

  useEffect(() => {
    if (!cart.length || !salon) {
      navigate('/salons?businessType=BOUTIQUE')
    }
  }, [cart, salon, navigate])

  if (!cart.length || !salon) return null

  const cartTotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0)
  const deliveryFee = deliveryMode === 'DELIVERY' ? 0 : 0
  const totalWithDelivery = cartTotal + deliveryFee

  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '')
    const num = cleaned.startsWith('221') ? cleaned.substring(3) : cleaned.startsWith('0') ? cleaned.substring(1) : cleaned
    const validPrefixes = ['77', '78', '76', '70', '75', '33']
    return num.length >= 9 && validPrefixes.some(p => num.startsWith(p))
  }

  const handleSubmitOrder = async () => {
    if (!paymentMethod) {
      setError('Veuillez choisir un mode de paiement')
      return
    }
    if (!clientPhone.trim()) {
      setError('Veuillez entrer votre numéro de téléphone')
      return
    }
    if (!validatePhone(clientPhone)) {
      setError('Numéro de téléphone invalide (77, 78, 76, 70, 75, 33)')
      return
    }
    if (deliveryMode === 'DELIVERY' && !deliveryAddress.trim()) {
      setError('Veuillez entrer votre adresse de livraison')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await apiFetch('/orders', {
        method: 'POST',
        body: {
          salonId: salon.id,
          items: cart.map(c => ({ productId: c.product.id, quantity: c.quantity })),
          deliveryMode,
          deliveryAddress: deliveryMode === 'DELIVERY' ? deliveryAddress : undefined,
          clientPhone: clientPhone || undefined,
          clientName: clientName || user?.name || undefined,
          notes: notes || undefined,
          paymentMethod: paymentMethod,
        }
      })

      const order = res?.data?.order || res?.order || res?.data || res
      navigate('/order/confirmation', {
        state: {
          order,
          cart,
          salon,
          paymentMethod,
          deliveryMode,
          deliveryAddress,
          clientPhone,
          clientName,
          totalPrice: totalWithDelivery,
        }
      })
    } catch (e) {
      setError(e.message || 'Erreur lors de la commande')
    } finally {
      setSubmitting(false)
    }
  }

  const canProceed = (s) => {
    if (s === 2) return true
    if (s === 3) {
      if (!clientPhone.trim()) return false
      if (deliveryMode === 'DELIVERY' && !deliveryAddress.trim()) return false
      return true
    }
    return true
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gold-50/20 py-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            disabled={submitting}
            className="flex items-center text-primary-600 hover:text-primary-900 transition-colors mb-4 disabled:opacity-50"
          >
            <FiChevronLeft className="w-5 h-5 mr-1" />
            Retour
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">Finaliser la commande</h1>
          <p className="text-primary-500 mt-1">Chez {salon.name}</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center mb-8">
          {[
            { n: 1, label: 'Panier', icon: FiShoppingBag },
            { n: 2, label: 'Livraison', icon: FiTruck },
            { n: 3, label: 'Paiement', icon: FiSmartphone },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <button
                onClick={() => { if (s.n < step || canProceed(s.n)) setStep(s.n) }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  step === s.n
                    ? 'bg-primary-900 text-white shadow-sm'
                    : step > s.n
                    ? 'bg-green-100 text-green-700'
                    : 'bg-primary-100 text-primary-500'
                }`}
              >
                {step > s.n ? <FiCheck className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < 2 && <div className="flex-1 h-px bg-primary-200 mx-2" />}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Main Content */}
          <div className="md:col-span-3">
            <AnimatePresence mode="wait">
              {/* Step 1: Cart Review */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-2xl shadow-sm p-5 sm:p-6"
                >
                  <h2 className="text-lg font-bold text-primary-900 mb-4 flex items-center gap-2">
                    <FiShoppingBag className="w-5 h-5" /> Votre panier ({cartCount} article{cartCount > 1 ? 's' : ''})
                  </h2>
                  <div className="space-y-3">
                    {cart.map(c => {
                      const img = resolveMediaUrl(c.product.imageUrl || c.product.image)
                      return (
                        <div key={c.product.id} className="flex items-center gap-4 p-3 bg-primary-50 rounded-xl">
                          {img ? (
                            <img src={img} alt={c.product.name} className="w-16 h-16 rounded-xl object-contain bg-white border" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-primary-100 flex items-center justify-center">
                              <FiPackage className="w-6 h-6 text-primary-300" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-primary-900 truncate">{c.product.name}</p>
                            <p className="text-sm text-primary-500">{formatPrice(c.product.price)} × {c.quantity}</p>
                          </div>
                          <p className="font-bold text-primary-900">{formatPrice(c.product.price * c.quantity)}</p>
                        </div>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full mt-6 py-3.5 rounded-xl bg-primary-900 text-white font-semibold hover:bg-primary-800 transition-all"
                  >
                    Continuer
                  </button>
                </motion.div>
              )}

              {/* Step 2: Delivery */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-2xl shadow-sm p-5 sm:p-6"
                >
                  <h2 className="text-lg font-bold text-primary-900 mb-4 flex items-center gap-2">
                    <FiTruck className="w-5 h-5" /> Informations de livraison
                  </h2>

                  {/* Delivery Mode */}
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-primary-700 mb-2">Mode de réception</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setDeliveryMode('PICKUP')}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                          deliveryMode === 'PICKUP'
                            ? 'border-primary-900 bg-primary-50'
                            : 'border-primary-200 hover:border-primary-300'
                        }`}
                      >
                        <FiHome className="w-5 h-5" />
                        <div className="text-left">
                          <p className="font-semibold text-sm">Retrait en boutique</p>
                          <p className="text-xs text-primary-500">Gratuit</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setDeliveryMode('DELIVERY')}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                          deliveryMode === 'DELIVERY'
                            ? 'border-primary-900 bg-primary-50'
                            : 'border-primary-200 hover:border-primary-300'
                        }`}
                      >
                        <FiTruck className="w-5 h-5" />
                        <div className="text-left">
                          <p className="font-semibold text-sm">Livraison</p>
                          <p className="text-xs text-primary-500">À domicile</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      <FiUser className="inline w-4 h-4 mr-1" /> Nom complet
                    </label>
                    <input
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none"
                      placeholder="Votre nom"
                    />
                  </div>

                  {/* Phone */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      <FiPhone className="inline w-4 h-4 mr-1" /> Téléphone *
                    </label>
                    <input
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      type="tel"
                      className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none"
                      placeholder="77 123 45 67"
                    />
                  </div>

                  {/* Address */}
                  {deliveryMode === 'DELIVERY' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-primary-700 mb-1">
                        <FiMapPin className="inline w-4 h-4 mr-1" /> Adresse de livraison *
                      </label>
                      <input
                        value={deliveryAddress}
                        onChange={e => setDeliveryAddress(e.target.value)}
                        className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none"
                        placeholder="Votre adresse complète"
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-primary-700 mb-1">Notes (optionnel)</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none resize-none"
                      placeholder="Instructions spéciales..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="px-5 py-3 rounded-xl border border-primary-200 text-primary-700 font-semibold hover:bg-primary-50 transition-all"
                    >
                      Retour
                    </button>
                    <button
                      onClick={() => {
                        if (!clientPhone.trim()) { setError('Téléphone requis'); return }
                        if (deliveryMode === 'DELIVERY' && !deliveryAddress.trim()) { setError('Adresse requise'); return }
                        setError('')
                        setStep(3)
                      }}
                      className="flex-1 py-3 rounded-xl bg-primary-900 text-white font-semibold hover:bg-primary-800 transition-all"
                    >
                      Continuer
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Payment */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-2xl shadow-sm p-5 sm:p-6"
                >
                  <h2 className="text-lg font-bold text-primary-900 mb-4 flex items-center gap-2">
                    <FiSmartphone className="w-5 h-5" /> Mode de paiement
                  </h2>

                  <div className="space-y-3">
                    {PAYMENT_METHODS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { setPaymentMethod(m.id); setError('') }}
                        className={`w-full flex items-center p-4 border-2 rounded-xl transition-all ${
                          paymentMethod === m.id
                            ? 'border-primary-900 bg-primary-50'
                            : 'border-primary-200 hover:border-primary-300'
                        }`}
                      >
                        <span className="text-2xl mr-4">{m.icon}</span>
                        <div className="text-left flex-1">
                          <p className="font-semibold text-primary-900">{m.name}</p>
                          <p className="text-sm text-primary-500">{m.desc}</p>
                        </div>
                        {paymentMethod === m.id && <FiCheck className="w-5 h-5 text-primary-900" />}
                      </button>
                    ))}
                  </div>

                  {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center">
                      <FiAlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setStep(2)}
                      className="px-5 py-3 rounded-xl border border-primary-200 text-primary-700 font-semibold hover:bg-primary-50 transition-all"
                    >
                      Retour
                    </button>
                    <button
                      onClick={handleSubmitOrder}
                      disabled={submitting || !paymentMethod}
                      className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <LoadingSpinner size="sm" /> Envoi en cours...
                        </span>
                      ) : (
                        `Confirmer et payer ${formatPrice(totalWithDelivery)}`
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary Sidebar */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm p-5 md:sticky md:top-24">
              <h3 className="font-bold text-primary-900 mb-4">Récapitulatif</h3>

              {/* Boutique info */}
              <div className="flex items-center gap-3 pb-4 border-b border-primary-100">
                <div className="w-10 h-10 rounded-xl bg-gold-100 flex items-center justify-center text-gold-700 font-bold">
                  {salon.name?.charAt(0) || 'B'}
                </div>
                <div>
                  <p className="font-semibold text-primary-900 text-sm">{salon.name}</p>
                  <p className="text-xs text-primary-500">{salon.address || salon.city || 'Boutique'}</p>
                </div>
              </div>

              {/* Items */}
              <div className="py-3 border-b border-primary-100 space-y-2">
                {cart.map(c => (
                  <div key={c.product.id} className="flex justify-between text-sm">
                    <span className="text-primary-600">{c.product.name} × {c.quantity}</span>
                    <span className="font-medium">{formatPrice(c.product.price * c.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Delivery info */}
              {step >= 2 && (
                <div className="py-3 border-b border-primary-100 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-primary-500">Livraison</span>
                    <span className="font-medium">{deliveryMode === 'PICKUP' ? 'Retrait' : 'Livraison'}</span>
                  </div>
                  {clientPhone && (
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-500">Tél</span>
                      <span className="font-medium">{clientPhone}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Payment method */}
              {step >= 3 && paymentMethod && (
                <div className="py-3 border-b border-primary-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-primary-500">Paiement</span>
                    <span className="font-medium">{PAYMENT_METHODS.find(m => m.id === paymentMethod)?.name}</span>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-gold-600">{formatPrice(totalWithDelivery)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout
