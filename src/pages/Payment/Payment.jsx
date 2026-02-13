import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiCheck, FiLock, FiCreditCard, FiSmartphone, FiChevronLeft, FiAlertCircle } from 'react-icons/fi'
import { useBooking } from '../../context/BookingContext'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import apiFetch from '../../api/client'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// Méthodes de paiement autorisées - MVP
const PAYMENT_METHODS = [
  {
    id: 'orange_money',
    name: 'Orange Money',
    icon: '🟠',
    color: 'orange',
    description: 'Paiement mobile Orange',
  },
  {
    id: 'wave',
    name: 'Wave',
    icon: '🌊',
    color: 'blue',
    description: 'Paiement rapide Wave',
  },
  {
    id: 'pay_on_site',
    name: 'Paiement sur place',
    icon: '💵',
    color: 'gray',
    description: 'Payez directement au salon',
  },
]

function Payment() {
  const navigate = useNavigate()
  const { state: bookingState, dispatch: bookingDispatch } = useBooking()
  const { user } = useAuth()
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [phoneNumber, setPhoneNumber] = useState(
    bookingState.clientPhone || user?.phoneNumber || user?.phone || ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentStatus, setPaymentStatus] = useState(null) // null, 'processing', 'pending_confirmation'

  // Redirect if no booking
  if (!bookingState.salon || bookingState.services.length === 0) {
    navigate('/salons')
    return null
  }

  // Calculate amounts
  const depositPercentage = bookingState.salon?.depositPercentage || 25
  const depositAmount = Math.round(bookingState.totalPrice * depositPercentage / 100)
  const remainingAmount = bookingState.totalPrice - depositAmount

  // Format phone number for Senegal
  const formatPhoneNumber = (phone) => {
    let cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('221')) cleaned = cleaned.substring(3)
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1)
    return cleaned
  }

  // Validate Senegalese phone number
  const validatePhone = (phone) => {
    const cleaned = formatPhoneNumber(phone)
    const validPrefixes = ['77', '78', '76', '70', '75', '33']
    return cleaned.length >= 9 && validPrefixes.some(p => cleaned.startsWith(p))
  }

  const buildAppointmentNotes = () => {
    const baseNotes = bookingState.notes?.trim()
    const extraServices = bookingState.services.slice(1)
    const extraNote = extraServices.length > 0
      ? `Services additionnels: ${extraServices.map(s => `${s.name} (${s.price} FCFA)`).join(', ')}`
      : ''
    return [baseNotes, extraNote].filter(Boolean).join('\n')
  }

  const ensureAppointment = async () => {
    if (bookingState.bookingId) return bookingState.bookingId

    const serviceIds = bookingState.services.map(s => s.id).filter(Boolean)
    const primaryServiceId = serviceIds[0]
    if (!primaryServiceId) {
      throw new Error('Aucun service sélectionné')
    }

    const dateValue = bookingState.date instanceof Date
      ? bookingState.date.toISOString()
      : bookingState.date

    if (!dateValue || !bookingState.time) {
      throw new Error('Date ou heure manquante')
    }

    const clientFirstName = String(bookingState.clientFirstName || '').trim()
    const clientLastName = String(bookingState.clientLastName || '').trim()
    const clientPhone = String(bookingState.clientPhone || phoneNumber || '').trim()
    const clientAddress = String(bookingState.clientAddress || '').trim()
    if (!clientFirstName || !clientLastName || !clientPhone) {
      throw new Error('Prénom, nom et téléphone sont obligatoires pour confirmer la réservation')
    }

    const payload = {
      salonId: bookingState.salon.id,
      serviceId: primaryServiceId,
      serviceIds,
      date: dateValue,
      startTime: bookingState.time,
      notes: buildAppointmentNotes(),
      clientFirstName,
      clientLastName,
      clientPhone,
      clientAddress: clientAddress || null,
    }

    if (bookingState.coiffeur?.id) {
      payload.coiffeurId = bookingState.coiffeur.id
    }

    const result = await apiFetch('/appointments', { method: 'POST', body: payload })
    const appointment = result?.data?.appointment || result?.appointment
    if (!appointment?.id) {
      throw new Error('Impossible de créer la réservation')
    }

    bookingDispatch({ type: 'SET_BOOKING_ID', payload: appointment.id })
    return appointment.id
  }

  const handlePayment = async () => {
    if (!selectedMethod) {
      setError('Veuillez choisir un mode de paiement')
      return
    }

    if (['orange_money', 'wave'].includes(selectedMethod)) {
      if (!phoneNumber) {
        setError('Veuillez entrer votre numéro de téléphone')
        return
      }
      if (!validatePhone(phoneNumber)) {
        setError('Numéro de téléphone invalide. Utilisez un numéro sénégalais (77, 78, 76, 70, 75, 33)')
        return
      }
    }

    setLoading(true)
    setError('')
    setPaymentStatus('processing')

    try {
      const appointmentId = await ensureAppointment()
      // Pour paiement sur place, on peut confirmer directement
      if (selectedMethod === 'pay_on_site') {
        const response = await fetch(`${API_URL}/payments/confirm-on-site`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            amount: bookingState.totalPrice,
            bookingId: appointmentId,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors de la confirmation du paiement sur place')
        }

        handlePaymentSuccess(data.data, appointmentId)
        return
      }

      // Pour Wave et Orange Money
      const response = await fetch(`${API_URL}/payments/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          provider: selectedMethod.toUpperCase(),
          amount: depositAmount,
          phoneNumber: phoneNumber || undefined,
          bookingId: appointmentId,
        }),
      })

      // Vérifier si la réponse est vide
      const text = await response.text()
      if (!text) {
        throw new Error('Erreur de connexion au serveur. Veuillez réessayer.')
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors du paiement')
      }

      if (data.data.checkoutUrl || data.data.mockCheckoutUrl) {
        // Redirect to payment provider (Wave, Orange Money)
        setPaymentStatus('pending_confirmation')
        
        // Open payment URL in new tab (or mock in test mode)
        const url = data.data.checkoutUrl || data.data.mockCheckoutUrl
        if (url && url !== 'mock') {
          window.open(url, '_blank')
        }
        
        // Show waiting message - poll for status
        pollPaymentStatus(data.data.paymentId, appointmentId)
      } else {
        // Payment initiated, waiting for user to confirm on phone
        setPaymentStatus('pending_confirmation')
        pollPaymentStatus(data.data.paymentId, appointmentId)
      }
    } catch (err) {
      console.error('Payment error:', err)
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.')
      setPaymentStatus(null)
    } finally {
      setLoading(false)
    }
  }

  const pollPaymentStatus = async (paymentId, appointmentId) => {
    let attempts = 0
    const maxAttempts = 30 // 5 minutes max (10s interval)

    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/payments/${paymentId}/status`, {
          credentials: 'include',
        })
        const data = await response.json()

        if (data.data.payment.status === 'COMPLETED') {
          handlePaymentSuccess(data.data.payment, appointmentId)
          return
        }

        if (data.data.payment.status === 'FAILED') {
          setError('Le paiement a échoué. Veuillez réessayer.')
          setPaymentStatus(null)
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000) // Check every 10 seconds
        } else {
          setError('Délai d\'attente dépassé. Vérifiez votre téléphone et réessayez.')
          setPaymentStatus(null)
        }
      } catch (err) {
        console.error('Status check error:', err)
      }
    }

    setTimeout(checkStatus, 5000) // First check after 5 seconds
  }

  const handlePaymentSuccess = (paymentData, appointmentIdOverride) => {
    const appointmentId = appointmentIdOverride || bookingState.bookingId

    // Clear booking state
    bookingDispatch({ type: 'RESET' })
    localStorage.removeItem('flashrv_booking')

    // Redirect to success page
    const query = appointmentId ? `?appointmentId=${appointmentId}` : ''
    navigate(`/payment/success${query}`, { state: { appointmentId, paymentData } })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/20 py-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
      
      {/* Payment Pending Modal */}
      {paymentStatus === 'pending_confirmation' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-5 sm:p-8 max-w-md w-full text-center"
          >
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiSmartphone className="w-10 h-10 text-primary-600 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Confirmez le paiement
            </h3>
            <p className="text-gray-600 mb-4">
              {selectedMethod === 'wave' && 'Ouvrez l\'app Wave et confirmez le paiement'}
              {selectedMethod === 'orange_money' && 'Validez le paiement sur votre téléphone Orange Money'}
            </p>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <LoadingSpinner size="sm" />
              <span className="ml-2">En attente de confirmation...</span>
            </div>
            <button
              onClick={() => setPaymentStatus(null)}
              className="mt-6 text-gray-500 hover:text-gray-700 text-sm underline"
            >
              Annuler
            </button>
          </motion.div>
        </div>
      )}
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            disabled={loading || paymentStatus === 'pending_confirmation'}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4 disabled:opacity-50"
          >
            <FiChevronLeft className="w-5 h-5 mr-1" />
            Retour
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Paiement</h1>
          <p className="text-gray-600 mt-2">Finalisez votre réservation en toute sécurité</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 sm:gap-8">
          {/* Payment Methods */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Mode de paiement
              </h2>

              <div className="space-y-3">
                {PAYMENT_METHODS.map(method => (
                  <motion.button
                    key={method.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full flex items-center p-4 border-2 rounded-xl transition-all ${
                      selectedMethod === method.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl mr-4">{method.icon}</span>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900">{method.name}</p>
                      <p className="text-sm text-gray-500">{method.description}</p>
                    </div>
                    {selectedMethod === method.id && (
                      <FiCheck className="w-6 h-6 text-primary-600" />
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Phone number input for mobile payments */}
              {['orange_money', 'wave'].includes(selectedMethod) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6"
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiSmartphone className="inline w-4 h-4 mr-1" />
                    Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="77 123 45 67"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Vous recevrez une demande de paiement sur ce numéro
                  </p>
                </motion.div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center">
                  <FiAlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 md:sticky md:top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Récapitulatif
              </h2>

              {/* Salon info */}
              <div className="flex items-center pb-4 border-b border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-lg">
                  {bookingState.salon.name?.charAt(0) || 'S'}
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">{bookingState.salon.name}</h3>
                  <p className="text-sm text-gray-500">{bookingState.salon.address}</p>
                </div>
              </div>

              {/* Services */}
              <div className="py-4 border-b border-gray-100">
                <h4 className="font-medium text-gray-900 mb-3">Services</h4>
                {bookingState.services.map(service => (
                  <div key={service.id} className="flex justify-between text-sm mb-2 gap-3">
                    <span className="text-gray-600 break-words">{service.name}</span>
                    <span className="font-medium whitespace-nowrap">{service.price.toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>

              {/* Date & Time */}
              <div className="py-4 border-b border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date</span>
                  <span className="font-medium">
                    {bookingState.date && new Date(bookingState.date).toLocaleDateString('fr-FR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-600">Heure</span>
                  <span className="font-medium">{bookingState.time}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-600">Coiffeur(se)</span>
                  <span className="font-medium">{bookingState.coiffeur?.name}</span>
                </div>
              </div>

              {/* Total & Deposit */}
              <div className="py-4 space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total services</span>
                  <span className="font-medium">{bookingState.totalPrice.toLocaleString()} FCFA</span>
                </div>
                
                {selectedMethod && selectedMethod !== 'pay_on_site' ? (
                  <>
                    <div className="h-px bg-gray-200" />
                    <div className="bg-primary-50 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-dark-900">
                          Acompte à payer ({depositPercentage}%)
                        </span>
                        <span className="text-xl font-bold text-primary-600">
                          {depositAmount.toLocaleString()} FCFA
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>Reste à payer au salon</span>
                        <span>{remainingAmount.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-primary-600">
                      {bookingState.totalPrice.toLocaleString()} FCFA
                    </span>
                  </div>
                )}
              </div>

              {/* Cancellation Policy */}
              <div className="py-3 border-t border-gray-100">
                <div className="flex items-start space-x-2 text-xs text-gray-500">
                  <span className="text-amber-500 mt-0.5">⚠️</span>
                  <p>Annulation gratuite jusqu'à 30 min avant le RDV. L'acompte n'est pas remboursable en cas d'annulation tardive.</p>
                </div>
              </div>

              {/* Pay button */}
              <button
                onClick={handlePayment}
                disabled={loading || !selectedMethod || paymentStatus === 'pending_confirmation'}
                className="w-full py-4 px-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white font-semibold text-sm sm:text-base rounded-xl hover:from-primary-700 hover:to-accent-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-center"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <FiLock className="w-5 h-5 mr-2" />
                    {selectedMethod === 'pay_on_site' 
                      ? 'Confirmer la réservation' 
                      : `Payer l'acompte - ${depositAmount.toLocaleString()} FCFA`
                    }
                  </>
                )}
              </button>

              {/* Security note */}
              <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
                <FiLock className="w-4 h-4 mr-2" />
                Paiement 100% sécurisé
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Payment
