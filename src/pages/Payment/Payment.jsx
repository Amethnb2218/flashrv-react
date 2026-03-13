import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiCheck, FiLock, FiSmartphone, FiChevronLeft, FiAlertCircle } from 'react-icons/fi'
import { useBooking } from '../../context/BookingContext'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import apiFetch from '../../api/client'
import { resolveMediaUrl } from '../../utils/media'
import { buildPaydunyaPaymentPayload } from '../../utils/payments'
import { calculateBookingDeposit } from '../../utils/bookingDeposit'

const PAYMENT_METHODS = [
  {
    id: 'paydunya',
    name: 'PayDunya',
    icon: 'PD',
    description: 'Paiement securise (Orange, Free, Carte bancaire)',
  },
  {
    id: 'pay_on_site',
    name: 'Payer au salon',
    icon: 'Cash',
    description: 'Confirmez la reservation et payez sur place',
  },
]

const DUPLICATE_CONFLICT_PATTERNS = [
  'already exists',
  'record with this value already exists',
  'unique constraint',
  'duplicate',
]

const formatSlotLabel = (date, time) => {
  if (!date && !time) return 'ce créneau'

  const hasValidDate = date && !Number.isNaN(new Date(date).getTime())
  const formattedDate = hasValidDate
    ? new Date(date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null

  if (formattedDate && time) return `${formattedDate} à ${time}`
  if (formattedDate) return formattedDate
  return `à ${time}`
}

const isDuplicateConflictError = (error) => {
  const normalizedMessage = String(error?.message || '').toLowerCase()
  return Number(error?.status) === 409 || DUPLICATE_CONFLICT_PATTERNS.some((pattern) => normalizedMessage.includes(pattern))
}

const getFriendlyPaymentError = (error, { selectedMethod, bookingState, appointmentId }) => {
  const requestUrl = String(error?.url || '').toLowerCase()
  const slotLabel = formatSlotLabel(bookingState?.date, bookingState?.time)

  if (isDuplicateConflictError(error) && requestUrl.includes('/payments/confirm-on-site')) {
    return {
      message: 'Cette réservation a déjà été prise en compte. Vous pouvez la retrouver dans "Mes réservations".',
      type: 'existing_reservation',
    }
  }

  if (isDuplicateConflictError(error) && (requestUrl.includes('/appointments') || !appointmentId)) {
    return {
      message: `Le créneau ${slotLabel} n'est plus disponible. Une réservation existe déjà à cette heure. Choisissez un autre horaire pour continuer.`,
      type: 'slot_conflict',
    }
  }

  if (selectedMethod === 'paydunya' && appointmentId) {
    return {
      message: 'Le serveur est temporairement indisponible. Reessayez dans un instant. Votre réservation a bien été conservée.',
      type: 'pending_online_booking',
    }
  }

  return {
    message: error?.message || 'Une erreur est survenue. Veuillez reessayer.',
    type: 'generic',
  }
}

function Payment() {
  const navigate = useNavigate()
  const { state: bookingState, dispatch: bookingDispatch } = useBooking()
  const { user } = useAuth()

  const [selectedMethod, setSelectedMethod] = useState('paydunya')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentStatus, setPaymentStatus] = useState(null)

  useEffect(() => {
    if (!bookingState.salon || bookingState.services.length === 0) {
      navigate('/salons')
    }
  }, [bookingState.salon, bookingState.services.length, navigate])

  if (!bookingState.salon || bookingState.services.length === 0) {
    return null
  }

  const { depositAmount, remainingAmount, uniformPercentage, usesMixedPercentages } = useMemo(
    () =>
      calculateBookingDeposit({
        services: bookingState.services,
        salon: bookingState.salon,
        totalPrice: bookingState.totalPrice,
      }),
    [bookingState.services, bookingState.salon, bookingState.totalPrice]
  )
  const hasDeposit = depositAmount > 0
  const availablePaymentMethods = useMemo(
    () => PAYMENT_METHODS.filter((method) => hasDeposit || method.id !== 'paydunya'),
    [hasDeposit]
  )

  useEffect(() => {
    if (!hasDeposit && selectedMethod === 'paydunya') {
      setSelectedMethod('pay_on_site')
    }
  }, [hasDeposit, selectedMethod])

  const buildAppointmentNotes = () => {
    const baseNotes = bookingState.notes?.trim()
    const extraServices = bookingState.services.slice(1)
    const extraNote = extraServices.length > 0
      ? `Services additionnels: ${extraServices.map((s) => `${s.name} (${s.price} FCFA)`).join(', ')}`
      : ''

    return [baseNotes, extraNote].filter(Boolean).join('\n')
  }

  const ensureAppointment = async (paymentMethod) => {
    if (bookingState.bookingId) return bookingState.bookingId

    const serviceIds = bookingState.services.map((s) => s.id).filter(Boolean)
    const primaryServiceId = serviceIds[0]

    if (!primaryServiceId) {
      throw new Error('Aucun service selectionne')
    }

    const dateValue = bookingState.date instanceof Date
      ? bookingState.date.toISOString()
      : bookingState.date

    if (!dateValue || !bookingState.time) {
      throw new Error('Date ou heure manquante')
    }

    const clientFirstName = String(bookingState.clientFirstName || '').trim()
    const clientLastName = String(bookingState.clientLastName || '').trim()
    const clientPhone = String(bookingState.clientPhone || user?.phoneNumber || user?.phone || '').trim()
    const clientAddress = String(bookingState.clientAddress || '').trim()

    if (!clientFirstName || !clientLastName || !clientPhone) {
      throw new Error('Prenom, nom et telephone sont obligatoires pour confirmer la reservation')
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

    if (paymentMethod === 'paydunya') {
      payload.status = 'PENDING_PAYMENT'
      payload.paymentMethod = 'PAYDUNYA'
      payload.paymentStatus = 'PENDING'
      payload.requiresOnlinePayment = true
      payload.skipConfirmationEmail = true
      payload.skipNotifications = true
      payload.sendConfirmation = false
    }

    if (paymentMethod === 'pay_on_site') {
      payload.paymentMethod = 'PAY_ON_SITE'
    }

    if (bookingState.coiffeur?.id) {
      payload.coiffeurId = bookingState.coiffeur.id
    }

    const result = await apiFetch('/appointments', { method: 'POST', body: payload })
    const appointment = result?.data?.appointment || result?.appointment

    if (!appointment?.id) {
      throw new Error('Impossible de creer la reservation')
    }

    bookingDispatch({ type: 'SET_BOOKING_ID', payload: appointment.id })
    return appointment.id
  }

  const handlePaymentSuccess = (paymentData, appointmentIdOverride) => {
    const appointmentId = appointmentIdOverride || bookingState.bookingId

    bookingDispatch({ type: 'RESET' })
    sessionStorage.removeItem('flashrv_booking')

    const query = appointmentId ? `?appointmentId=${appointmentId}` : ''
    navigate(`/payment/success${query}`, { state: { appointmentId, paymentData } })
  }

  const handlePayment = async () => {
    if (!selectedMethod) {
      setError('Veuillez choisir un mode de paiement')
      return
    }

    setLoading(true)
    setError('')
    setPaymentStatus('processing')
    let appointmentId = bookingState.bookingId || null

    try {
      appointmentId = await ensureAppointment(selectedMethod)

      if (selectedMethod === 'pay_on_site') {
        const result = await apiFetch('/payments/confirm-on-site', {
          method: 'POST',
          body: {
            amount: bookingState.totalPrice,
            bookingId: appointmentId,
          },
        })

        handlePaymentSuccess(result?.data || result, appointmentId)
        return
      }

      const serviceLabel = bookingState.services.map((service) => service.name).filter(Boolean).join(', ')
      const paymentBody = buildPaydunyaPaymentPayload({
        bookingId: appointmentId,
        amount: depositAmount,
        customerName: `${bookingState.clientFirstName || ''} ${bookingState.clientLastName || ''}`.trim() || user?.name || '',
        customerEmail: user?.email || bookingState.clientEmail || '',
        customerPhone: bookingState.clientPhone || user?.phoneNumber || user?.phone || '',
        salonName: bookingState.salon?.name,
        serviceLabel,
      })

      let result
      const maxRetries = 2
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          result = await apiFetch('/payments/create', {
            method: 'POST',
            timeoutMs: 35000,
            body: paymentBody,
          })
          break
        } catch (retryErr) {
          const isRetryable = [0, 502, 503, 504].includes(retryErr?.status)
          if (!isRetryable || attempt === maxRetries) throw retryErr
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
        }
      }

      const payload = result?.data || result
      if (!payload?.invoiceUrl) {
        throw new Error('Erreur lors de la creation de facture PayDunya')
      }

      setPaymentStatus('pending_confirmation')
      window.location.href = payload.invoiceUrl
    } catch (err) {
      const friendlyError = getFriendlyPaymentError(err, {
        selectedMethod,
        bookingState,
        appointmentId,
      })
      if (friendlyError.type === 'existing_reservation' || friendlyError.type === 'slot_conflict') {
        bookingDispatch({ type: 'SET_BOOKING_ID', payload: null })
      }
      setError(friendlyError.message)
      setPaymentStatus(null)
    } finally {
      setLoading(false)
    }
  }

  const salonImage = resolveMediaUrl(
    bookingState.salon?.coverImage ||
    bookingState.salon?.image ||
    bookingState.salon?.gallery?.[0]?.url ||
    bookingState.salon?.gallery?.[0]?.media ||
    ''
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gold-50/20 py-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

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
            <h3 className="text-xl font-bold text-primary-900 mb-2">Redirection PayDunya</h3>
            <p className="text-primary-600 mb-4">Ouverture de la page de paiement securisee...</p>
            <div className="flex items-center justify-center text-sm text-primary-500">
              <LoadingSpinner size="sm" />
              <span className="ml-2">Veuillez patienter...</span>
            </div>
            <button
              onClick={() => setPaymentStatus(null)}
              className="mt-6 text-primary-500 hover:text-primary-700 text-sm underline"
            >
              Fermer
            </button>
          </motion.div>
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            disabled={loading || paymentStatus === 'pending_confirmation'}
            className="flex items-center text-primary-600 hover:text-primary-900 transition-colors mb-4 disabled:opacity-50"
          >
            <FiChevronLeft className="w-5 h-5 mr-1" />
            Retour
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">Paiement</h1>
          <p className="text-primary-600 mt-2">Finalisez votre reservation en toute securite</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 sm:gap-8">
          <div>
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
              <h2 className="text-xl font-bold text-primary-900 mb-6">Mode de paiement</h2>

              <div className="space-y-3">
                {availablePaymentMethods.map((method) => (
                  <motion.button
                    key={method.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full flex items-center p-4 border-2 rounded-xl transition-all ${
                      selectedMethod === method.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-primary-200 hover:border-primary-300'
                    }`}
                  >
                    <span className="text-sm sm:text-base mr-4 px-2.5 py-1 rounded-full bg-primary-100 font-semibold text-primary-700">
                      {method.icon}
                    </span>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-primary-900">{method.name}</p>
                      <p className="text-sm text-primary-500">{method.description}</p>
                    </div>
                    {selectedMethod === method.id && (
                      <FiCheck className="w-6 h-6 text-primary-600" />
                    )}
                  </motion.button>
                ))}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center">
                  <FiAlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 md:sticky md:top-24">
              <h2 className="text-xl font-bold text-primary-900 mb-6">Recapitulatif</h2>

              <div className="rounded-3xl border border-primary-100 overflow-hidden shadow-[0_20px_60px_-45px_rgba(17,24,39,0.45)]">
                <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-gold-700 px-5 py-5 text-white">
                  <div className="flex items-center gap-4">
                    {salonImage ? (
                      <img
                        src={salonImage}
                        alt={bookingState.salon.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-white/20"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-white/12 backdrop-blur flex items-center justify-center text-white font-bold text-2xl border border-white/10">
                        {bookingState.salon.name?.charAt(0) || 'S'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-white/60">Reservation</p>
                      <h3 className="font-semibold text-lg truncate">{bookingState.salon.name}</h3>
                      <p className="text-sm text-white/70 truncate">{bookingState.salon.address || bookingState.salon.neighborhood || 'Senegal'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white px-5 py-5">
                  <div className="pb-5 border-b border-primary-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-primary-900">Services</h4>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-100 text-primary-600">
                        {bookingState.services.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {bookingState.services.map((service) => (
                        <div key={service.id} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-primary-900 break-words">{service.name}</p>
                            <p className="text-xs text-primary-500">Prestation reservee</p>
                          </div>
                          <span className="text-sm font-semibold text-primary-900 whitespace-nowrap">
                            {service.price.toLocaleString()} FCFA
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="py-5 border-b border-primary-100 space-y-3">
                    <div className="flex justify-between items-center gap-4 text-sm">
                      <span className="text-primary-500">Date</span>
                      <span className="font-semibold text-primary-900 text-right">
                        {bookingState.date && new Date(bookingState.date).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-4 text-sm">
                      <span className="text-primary-500">Heure</span>
                      <span className="font-semibold text-primary-900">{bookingState.time}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4 text-sm">
                      <span className="text-primary-500">Coiffeur(se)</span>
                      <span className="font-semibold text-primary-900 text-right">{bookingState.coiffeur?.name || 'A definir'}</span>
                    </div>
                  </div>

                  <div className="pt-5 space-y-4">
                    <div className="flex justify-between text-sm text-primary-600">
                      <span>Total services</span>
                      <span className="font-semibold text-primary-900">{bookingState.totalPrice.toLocaleString()} FCFA</span>
                    </div>

                    {hasDeposit && selectedMethod && selectedMethod !== 'pay_on_site' ? (
                      <div className="rounded-2xl bg-gradient-to-br from-gold-50 to-orange-50 border border-gold-100 p-4">
                        <div className="flex justify-between items-start gap-3 mb-3">
                          <div>
                            <p className="text-sm font-semibold text-primary-900">
                              {`Acompte a payer${uniformPercentage !== null ? ` (${uniformPercentage}%)` : usesMixedPercentages ? ' (selon services)' : ''}`}
                            </p>
                            <p className="text-xs text-primary-500 mt-1">Paiement en ligne pour confirmer votre reservation</p>
                          </div>
                          <span className="text-2xl font-black text-gold-700 whitespace-nowrap">
                            {depositAmount.toLocaleString()} FCFA
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-primary-600 pt-3 border-t border-gold-100">
                          <span>Reste a payer au salon</span>
                          <span className="font-semibold text-primary-900">{remainingAmount.toLocaleString()} FCFA</span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-primary-50 border border-primary-100 p-4 space-y-3">
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-lg font-bold text-primary-900">{hasDeposit ? 'Total' : 'Aucun acompte requis'}</span>
                          <span className="text-2xl font-black text-primary-900">
                            {(hasDeposit ? bookingState.totalPrice : remainingAmount).toLocaleString()} FCFA
                          </span>
                        </div>
                        {!hasDeposit && (
                          <div className="flex justify-between items-center text-sm text-primary-600 pt-3 border-t border-primary-100">
                            <span>Total a payer au salon</span>
                            <span className="font-semibold text-primary-900">{remainingAmount.toLocaleString()} FCFA</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="py-3 border-t border-primary-100">
                <div className="flex items-start space-x-2 text-xs text-primary-500">
                  <span className="text-gold-500 mt-0.5">!</span>
                  <p>Annulation gratuite jusqu'a 30 min avant le RDV. L'acompte n'est pas remboursable en cas d'annulation tardive.</p>
                </div>
              </div>

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
                      ? 'Confirmer la reservation'
                      : `Payer l'acompte - ${depositAmount.toLocaleString()} FCFA`}
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center text-sm text-primary-500">
                <FiLock className="w-4 h-4 mr-2" />
                Paiement 100% securise
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Payment
