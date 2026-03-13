import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiAlertCircle, FiCalendar, FiCheck, FiClock, FiMapPin, FiRefreshCw, FiUser } from 'react-icons/fi'
import confetti from 'canvas-confetti'
import apiFetch from '../../api/client'
import { resolveMediaUrl } from '../../utils/media'

const APPOINTMENT_STATUS_LABELS = {
  PENDING_PAYMENT: 'En attente de paiement',
  PAID: 'Payee',
  PENDING: 'En attente',
  PENDING_ASSIGNMENT: 'En attente d\'assignation',
  CONFIRMED: 'Confirmee',
  CONFIRMED_ON_SITE: 'Confirmee (paiement au salon)',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminee',
  CANCELLED: 'Annulee',
  NO_SHOW: 'Absence',
}

const formatPrice = (value) => Number(value || 0).toLocaleString('fr-FR')

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function PaymentSuccess() {
  const location = useLocation()

  const [appointment, setAppointment] = useState(null)
  const [payment, setPayment] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const appointmentId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    return location.state?.appointmentId || searchParams.get('appointmentId')
  }, [location.search, location.state])

  const appointmentStatus = String(appointment?.status || '').toUpperCase()
  const isPaid = String(payment?.status || '').toUpperCase() === 'COMPLETED' || appointmentStatus === 'PAID'
  const isConfirmedOnSite = ['CONFIRMED_ON_SITE', 'CONFIRMED'].includes(appointmentStatus)
  const isReservationConfirmed = isPaid || isConfirmedOnSite
  const statusToneClass = isReservationConfirmed ? 'text-green-600' : 'text-gold-700'
  const heroToneClass = isReservationConfirmed
    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
    : 'bg-gradient-to-r from-gold-500 to-orange-500'
  const heroTitle = isPaid
    ? 'Paiement confirme !'
    : isConfirmedOnSite
      ? 'Reservation confirmee !'
      : 'Paiement en attente'
  const heroMessage = isPaid
    ? 'Votre reservation est payee et enregistree.'
    : isConfirmedOnSite
      ? 'Votre reservation est bien confirmee. Le paiement se fera directement au salon.'
      : 'Votre reservation est creee, finalisez le paiement pour confirmer.'

  useEffect(() => {
    const loadData = async () => {
      if (!appointmentId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')

      try {
        let verifiedPayment = null
        try {
          const verifyRes = await apiFetch(`/payments/verify/${appointmentId}`)
          verifiedPayment = verifyRes?.data?.payment || verifyRes?.payment || null
          setPayment(verifiedPayment)
        } catch (verifyError) {
          if (!String(verifyError?.message || '').toLowerCase().includes('introuvable')) {
            throw verifyError
          }
        }

        const appointmentRes = await apiFetch(`/appointments/${appointmentId}`)
        const appt = appointmentRes?.data?.appointment || appointmentRes?.appointment || null
        setAppointment(appt)

        const normalizedStatus = String(appt?.status || '').toUpperCase()
        if (
          appt &&
          (
            ['PAID', 'CONFIRMED', 'CONFIRMED_ON_SITE'].includes(normalizedStatus) ||
            String(verifiedPayment?.status || '').toUpperCase() === 'COMPLETED'
          )
        ) {
          confetti({ particleCount: 110, spread: 65, origin: { y: 0.6 } })
        }
      } catch (err) {
        setError(err.message || 'Erreur lors du chargement de la reservation')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [appointmentId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gold-50/30 py-12 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10 max-w-md mx-auto px-4 text-center">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAlertCircle className="w-8 h-8 text-gold-600" />
            </div>
            <h2 className="text-xl font-bold text-primary-900 mb-2">Reservation introuvable</h2>
            <p className="text-primary-600 mb-6">
              {error || 'Impossible de recuperer la reservation.'}
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/dashboard"
                className="py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
              >
                Voir mes reservations
              </Link>
              <Link
                to="/salons"
                className="py-3 border border-primary-600 text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
              >
                Retour aux salons
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const booking = {
    id: appointment.id,
    date: appointment.date,
    time: appointment.startTime,
    salon: appointment.salon || {},
    services: appointment.service ? [appointment.service] : [],
    totalPrice: appointment.totalPrice ?? appointment.service?.price ?? 0,
    coiffeur: appointment.coiffeur?.user || appointment.coiffeur || null,
    status: String(appointment.status || '').toUpperCase(),
  }

  const statusLabel = APPOINTMENT_STATUS_LABELS[booking.status] || booking.status || 'En attente'
  const salonImage = resolveMediaUrl(booking.salon?.image || booking.salon?.gallery?.[0]?.url || '')

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gold-50/30 py-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

      <div className="relative z-10 max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden"
        >
          <div className={`px-6 py-12 text-center ${heroToneClass}`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6"
            >
              {isReservationConfirmed ? (
                <FiCheck className="w-10 h-10 text-green-500" />
              ) : (
                <FiAlertCircle className="w-10 h-10 text-gold-500" />
              )}
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {heroTitle}
            </h1>
            <p className={`${isReservationConfirmed ? 'text-green-100' : 'text-gold-100'}`}>
              {heroMessage}
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="text-center mb-8">
              <p className="text-sm text-primary-500 mb-1">Reference reservation</p>
              <p className="text-lg sm:text-2xl font-bold text-primary-600 font-mono break-all">{booking.id}</p>
            </div>

            <div className="bg-primary-50 rounded-2xl p-6 mb-8">
              <div className="flex flex-col sm:flex-row items-start mb-6 pb-6 border-b border-primary-200 gap-3 sm:gap-0">
                {salonImage ? (
                  <img src={salonImage} alt={booking.salon.name} className="w-20 h-20 rounded-xl object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
                    {booking.salon.name?.charAt(0) || 'S'}
                  </div>
                )}
                <div className="ml-4">
                  <h3 className="font-bold text-primary-900 text-lg">{booking.salon.name}</h3>
                  <div className="flex items-center text-primary-500 text-sm mt-1">
                    <FiMapPin className="w-4 h-4 mr-1" />
                    {booking.salon.address}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center mr-3">
                    <FiCalendar className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-primary-500">Date</p>
                    <p className="font-semibold text-primary-900">{formatDate(booking.date)}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center mr-3">
                    <FiClock className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-primary-500">Heure</p>
                    <p className="font-semibold text-primary-900">{booking.time}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center mr-3">
                    <FiUser className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-primary-500">Coiffeur(se)</p>
                    <p className="font-semibold text-primary-900">{booking.coiffeur?.name || 'A assigner'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${isReservationConfirmed ? 'bg-green-100' : 'bg-gold-100'}`}>
                    {isReservationConfirmed ? <FiCheck className="w-5 h-5 text-green-600" /> : <FiAlertCircle className="w-5 h-5 text-gold-600" />}
                  </div>
                  <div>
                    <p className="text-sm text-primary-500">Statut</p>
                    <p className={`font-semibold ${statusToneClass}`}>{statusLabel}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-primary-200">
                <p className="text-sm text-primary-500 mb-3">Services reserves</p>
                <div className="space-y-2">
                  {booking.services.map((service) => (
                    <div key={service.id} className="flex justify-between">
                      <span className="text-primary-700">{service.name}</span>
                      <span className="font-medium text-primary-900">{formatPrice(service.price)} FCFA</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4 pt-4 border-t border-primary-200">
                  <span className="font-bold text-primary-900">Total</span>
                  <span className="font-bold text-primary-600 text-xl">{formatPrice(booking.totalPrice)} FCFA</span>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {!isReservationConfirmed && (
                <Link
                  to={`/payment/cancel?appointmentId=${encodeURIComponent(booking.id)}`}
                  className="flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                >
                  <FiRefreshCw className="w-5 h-5 mr-2" />
                  Reessayer le paiement
                </Link>
              )}
              <Link
                to="/dashboard"
                className="flex items-center justify-center px-6 py-3 border border-primary-300 text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
              >
                Voir mes reservations
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default PaymentSuccess
