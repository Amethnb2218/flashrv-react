import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiCheck, FiLock, FiSmartphone, FiChevronLeft, FiAlertCircle } from 'react-icons/fi'
import { useBooking } from '../../context/BookingContext'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import apiFetch from '../../api/client'
import { pushSiteNotification } from '../../utils/siteNotifications'
import { resolveMediaUrl } from '../../utils/media'
import { buildPaydunyaPaymentPayload } from '../../utils/payments'

const PAYMENT_METHODS = [
  {
    id: 'paydunya',
    name: 'PayDunya',
    icon: 'PD',
    description: 'Paiement securise (Wave, Orange, Free, Carte bancaire)',
  },
  {
    id: 'pay_on_site',
    name: 'Payer au salon',
    icon: 'Cash',
    description: 'Confirmez la reservation et payez sur place',
  },
]

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

  const { depositPercentage, depositAmount, remainingAmount } = useMemo(() => {
    const pct = Number(bookingState.salon?.depositPercentage || 25)
    const total = Number(bookingState.totalPrice || 0)
    const deposit = Math.round((total * pct) / 100)

    return {
      depositPercentage: pct,
      depositAmount: deposit,
      remainingAmount: Math.max(total - deposit, 0),
    }
  }, [bookingState.salon?.depositPercentage, bookingState.totalPrice])

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

    pushSiteNotification({
      userId: user?.id || user?.email,
      type: 'booking_confirmation',
      message: `Reservation confirmee chez ${bookingState.salon?.name || 'votre salon'} le ${bookingState.date || ''} a ${bookingState.time || ''}.`,
      meta: { appointmentId, salonId: bookingState.salon?.id },
    })

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
      const result = await apiFetch('/payments/create', {
        method: 'POST',
        timeoutMs: 20000,
        body: buildPaydunyaPaymentPayload({
          bookingId: appointmentId,
          amount: depositAmount,
          customerName: `${bookingState.clientFirstName || ''} ${bookingState.clientLastName || ''}`.trim() || user?.name || '',
          customerEmail: user?.email || bookingState.clientEmail || '',
          customerPhone: bookingState.clientPhone || user?.phoneNumber || user?.phone || '',
          salonName: bookingState.salon?.name,
          serviceLabel,
        }),
      })

      const payload = result?.data || result
      if (!payload?.invoiceUrl) {
        throw new Error('Erreur lors de la creation de facture PayDunya')
      }

      setPaymentStatus('pending_confirmation')
      window.location.href = payload.invoiceUrl
    } catch (err) {
      const hasPendingPaydunyaBooking = selectedMethod === 'paydunya' && Boolean(appointmentId)
      if (hasPendingPaydunyaBooking) {
        setError(`${err?.message || 'Le paiement est indisponible pour le moment.'} Votre reservation est conservee, reessayez dans un instant.`)
      } else {
        setError(
          selectedMethod === 'paydunya'
            ? (err.message || 'Une erreur est survenue.')
            : (err.message || 'Une erreur est survenue. Veuillez reessayer.')
        )
      }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/20 py-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Redirection PayDunya</h3>
            <p className="text-gray-600 mb-4">Ouverture de la page de paiement securisee...</p>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <LoadingSpinner size="sm" />
              <span className="ml-2">Veuillez patienter...</span>
            </div>
            <button
              onClick={() => setPaymentStatus(null)}
              className="mt-6 text-gray-500 hover:text-gray-700 text-sm underline"
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
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4 disabled:opacity-50"
          >
            <FiChevronLeft className="w-5 h-5 mr-1" />
            Retour
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Paiement</h1>
          <p className="text-gray-600 mt-2">Finalisez votre reservation en toute securite</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 sm:gap-8">
          <div>
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Mode de paiement</h2>

              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => (
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
                    <span className="text-sm sm:text-base mr-4 px-2.5 py-1 rounded-full bg-gray-100 font-semibold text-gray-700">
                      {method.icon}
                    </span>
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
              <h2 className="text-xl font-bold text-gray-900 mb-6">Recapitulatif</h2>

              <div className="rounded-3xl border border-gray-100 overflow-hidden shadow-[0_20px_60px_-45px_rgba(17,24,39,0.45)]">
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-700 px-5 py-5 text-white">
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
                  <div className="pb-5 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">Services</h4>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                        {bookingState.services.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {bookingState.services.map((service) => (
                        <div key={service.id} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 break-words">{service.name}</p>
                            <p className="text-xs text-gray-500">Prestation reservee</p>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {service.price.toLocaleString()} FCFA
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="py-5 border-b border-gray-100 space-y-3">
                    <div className="flex justify-between items-center gap-4 text-sm">
                      <span className="text-gray-500">Date</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {bookingState.date && new Date(bookingState.date).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-4 text-sm">
                      <span className="text-gray-500">Heure</span>
                      <span className="font-semibold text-gray-900">{bookingState.time}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4 text-sm">
                      <span className="text-gray-500">Coiffeur(se)</span>
                      <span className="font-semibold text-gray-900 text-right">{bookingState.coiffeur?.name || 'A definir'}</span>
                    </div>
                  </div>

                  <div className="pt-5 space-y-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Total services</span>
                      <span className="font-semibold text-gray-900">{bookingState.totalPrice.toLocaleString()} FCFA</span>
                    </div>

                    {selectedMethod && selectedMethod !== 'pay_on_site' ? (
                      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-4">
                        <div className="flex justify-between items-start gap-3 mb-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Acompte a payer ({depositPercentage}%)</p>
                            <p className="text-xs text-gray-500 mt-1">Paiement en ligne pour confirmer votre reservation</p>
                          </div>
                          <span className="text-2xl font-black text-amber-700 whitespace-nowrap">
                            {depositAmount.toLocaleString()} FCFA
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600 pt-3 border-t border-amber-100">
                          <span>Reste a payer au salon</span>
                          <span className="font-semibold text-gray-900">{remainingAmount.toLocaleString()} FCFA</span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 flex justify-between items-center gap-4">
                        <span className="text-lg font-bold text-gray-900">Total</span>
                        <span className="text-2xl font-black text-gray-900">{bookingState.totalPrice.toLocaleString()} FCFA</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="py-3 border-t border-gray-100">
                <div className="flex items-start space-x-2 text-xs text-gray-500">
                  <span className="text-amber-500 mt-0.5">!</span>
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

              <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
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
