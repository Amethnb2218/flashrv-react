import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiCheck, FiCalendar, FiMapPin, FiClock, FiUser, FiDownload, FiShare2, FiAlertCircle } from 'react-icons/fi'
import confetti from 'canvas-confetti'

function PaymentSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(location.state?.booking || null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Si pas de booking dans le state, chercher dans localStorage
    if (!booking) {
      const savedBookings = JSON.parse(localStorage.getItem('flashrv_bookings') || '[]')
      if (savedBookings.length > 0) {
        // Prendre la dernière réservation
        setBooking(savedBookings[savedBookings.length - 1])
      }
    }
    setIsLoading(false)

    // Trigger confetti seulement si booking existe
    if (booking || location.state?.booking) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })
    }
  }, [booking, location.state])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  // Fallback si pas de booking
  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30 py-12 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
        <div className="relative z-10 max-w-md mx-auto px-4 text-center">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Aucune réservation trouvée</h2>
            <p className="text-gray-600 mb-6">
              Il semble que vous n'ayez pas de réservation récente ou que la session a expiré.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/dashboard"
                className="py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
              >
                Voir mes réservations
              </Link>
              <Link
                to="/salons"
                className="py-3 border border-primary-600 text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
              >
                Réserver maintenant
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30 py-12 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
      
      <div className="relative z-10 max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden"
        >
          {/* Success header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-12 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <FiCheck className="w-10 h-10 text-green-500" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Réservation confirmée !</h1>
            <p className="text-green-100">Votre rendez-vous a été enregistré avec succès</p>
          </div>

          {/* Booking details */}
          <div className="p-6 sm:p-8">
            {/* Reference */}
            <div className="text-center mb-8">
              <p className="text-sm text-gray-500 mb-1">Référence de réservation</p>
              <p className="text-2xl font-bold text-primary-600 font-mono">{booking.id}</p>
            </div>

            {/* Details card */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-8">
              {/* Salon */}
              <div className="flex items-start mb-6 pb-6 border-b border-gray-200">
                <img
                  src={booking.salon.image}
                  alt={booking.salon.name}
                  className="w-20 h-20 rounded-xl object-cover"
                />
                <div className="ml-4">
                  <h3 className="font-bold text-gray-900 text-lg">{booking.salon.name}</h3>
                  <div className="flex items-center text-gray-500 text-sm mt-1">
                    <FiMapPin className="w-4 h-4 mr-1" />
                    {booking.salon.address}
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center mr-3">
                    <FiCalendar className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-semibold text-gray-900">{formatDate(booking.date)}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center mr-3">
                    <FiClock className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Heure</p>
                    <p className="font-semibold text-gray-900">{booking.time}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center mr-3">
                    <FiUser className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Coiffeur(se)</p>
                    <p className="font-semibold text-gray-900">{booking.coiffeur?.name}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                    <FiCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Statut</p>
                    <p className="font-semibold text-green-600">
                      {booking.status === 'pending_payment' ? 'En attente de paiement' : 'Confirmée'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-3">Services réservés</p>
                <div className="space-y-2">
                  {booking.services.map(service => (
                    <div key={service.id} className="flex justify-between">
                      <span className="text-gray-700">{service.name}</span>
                      <span className="font-medium text-gray-900">{service.price.toLocaleString()} FCFA</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4 pt-4 border-t border-gray-200">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-primary-600 text-xl">
                    {booking.totalPrice.toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="flex-1 flex items-center justify-center px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">
                <FiDownload className="w-5 h-5 mr-2" />
                Télécharger le reçu
              </button>
              <button className="flex-1 flex items-center justify-center px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">
                <FiShare2 className="w-5 h-5 mr-2" />
                Partager
              </button>
            </div>

            {/* Add to calendar */}
            <div className="mt-6 p-4 bg-primary-50 rounded-xl">
              <p className="text-sm text-primary-700 text-center">
                📅 N'oubliez pas d'ajouter ce rendez-vous à votre calendrier !
              </p>
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                to="/dashboard"
                className="flex-1 py-3 bg-primary-600 text-white text-center font-semibold rounded-xl hover:bg-primary-700 transition-colors"
              >
                Voir mes réservations
              </Link>
              <Link
                to="/salons"
                className="flex-1 py-3 border border-primary-600 text-primary-600 text-center font-semibold rounded-xl hover:bg-primary-50 transition-colors"
              >
                Continuer à explorer
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Help text */}
        <p className="text-center text-gray-500 text-sm mt-8">
          Besoin d'aide ? Contactez-nous au{' '}
          <a href="https://wa.me/221776762784" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">
            WhatsApp
          </a>
          {' '}ou par email à{' '}
          <a href="mailto:mouhamed26.sall@gmail.com" className="text-primary-600 hover:underline">
            mouhamed26.sall@gmail.com
          </a>
        </p>
      </div>
    </div>
  )
}

export default PaymentSuccess

