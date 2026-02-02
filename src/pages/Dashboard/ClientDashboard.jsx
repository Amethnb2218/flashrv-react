import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  FiCalendar, FiClock, FiMapPin, FiStar, FiMoreVertical, 
  FiX, FiRefreshCw, FiHeart, FiSettings, FiChevronRight,
  FiGift, FiAward, FiPercent
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { loyaltyConfig } from '../../data/salons'
import Modal from '../../components/UI/Modal'

function ClientDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('upcoming')
  const [bookings, setBookings] = useState([])
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)

  useEffect(() => {
    if (!user) return
    // Load bookings from localStorage
    const savedBookings = JSON.parse(localStorage.getItem('flashrv_bookings') || '[]')
    // Filter bookings for current user
    const userBookings = savedBookings.filter(b => b.user?.id === user?.id)
    setBookings(userBookings)
  }, [user])

  const upcomingBookings = bookings.filter(b => new Date(b.date) >= new Date())
  const pastBookings = bookings.filter(b => new Date(b.date) < new Date())

  const handleCancelBooking = () => {
    if (!selectedBooking) return
    
    const updatedBookings = bookings.map(b => 
      b.id === selectedBooking.id ? { ...b, status: 'cancelled' } : b
    )
    setBookings(updatedBookings)
    
    // Update localStorage
    const allBookings = JSON.parse(localStorage.getItem('flashrv_bookings') || '[]')
    const updated = allBookings.map(b => 
      b.id === selectedBooking.id ? { ...b, status: 'cancelled' } : b
    )
    localStorage.setItem('flashrv_bookings', JSON.stringify(updated))
    
    setShowCancelModal(false)
    setSelectedBooking(null)
  }

  const getStatusBadge = (status) => {
    const styles = {
      confirmed: 'bg-green-100 text-green-700',
      pending_payment: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700',
      completed: 'bg-gray-100 text-gray-700',
    }
    const labels = {
      confirmed: 'Confirmée',
      pending_payment: 'En attente',
      cancelled: 'Annulée',
      completed: 'Terminée',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.confirmed}`}>
        {labels[status] || status}
      </span>
    )
  }

  const BookingCard = ({ booking }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <img
              src={booking.salon?.image}
              alt={booking.salon?.name}
              className="w-16 h-16 rounded-xl object-cover"
            />
            <div className="ml-4">
              <h3 className="font-bold text-gray-900">{booking.salon?.name}</h3>
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <FiMapPin className="w-4 h-4 mr-1" />
                {booking.salon?.address}
              </div>
            </div>
          </div>
          {getStatusBadge(booking.status)}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 py-4 border-t border-b border-gray-100">
          <div className="flex items-center">
            <FiCalendar className="w-5 h-5 text-primary-600 mr-2" />
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p className="font-medium text-gray-900">
                {new Date(booking.date).toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short'
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <FiClock className="w-5 h-5 text-primary-600 mr-2" />
            <div>
              <p className="text-xs text-gray-500">Heure</p>
              <p className="font-medium text-gray-900">{booking.time}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500">Montant</p>
            <p className="font-bold text-primary-600">{booking.totalPrice?.toLocaleString()} FCFA</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-2">Services</p>
          <div className="flex flex-wrap gap-2">
            {booking.services?.map(service => (
              <span 
                key={service.id}
                className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-sm"
              >
                {service.name}
              </span>
            ))}
          </div>
        </div>

        {booking.status === 'confirmed' && new Date(booking.date) >= new Date() && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setSelectedBooking(booking)
                setShowCancelModal(true)
              }}
              className="flex-1 py-2 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium"
            >
              <FiX className="inline w-4 h-4 mr-1" />
              Annuler
            </button>
            <button className="flex-1 py-2 border border-primary-300 text-primary-600 rounded-xl hover:bg-primary-50 transition-colors text-sm font-medium">
              <FiRefreshCw className="inline w-4 h-4 mr-1" />
              Modifier
            </button>
          </div>
        )}

        {booking.status === 'completed' && (
          <button className="w-full mt-4 py-2 bg-yellow-50 text-yellow-700 rounded-xl hover:bg-yellow-100 transition-colors text-sm font-medium">
            <FiStar className="inline w-4 h-4 mr-1" />
            Laisser un avis
          </button>
        )}
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/20 py-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-100/30 rounded-full blur-3xl translate-y-1/2"></div>
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Bonjour, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-600 mt-1">Gérez vos réservations et votre compte</p>
          </div>
          <Link
            to="/salons"
            className="mt-4 sm:mt-0 inline-flex items-center px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors"
          >
            Nouvelle réservation
            <FiChevronRight className="ml-2 w-5 h-5" />
          </Link>
        </div>

        {/* Quick stats */}
        <div className="grid sm:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Réservations à venir</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{upcomingBookings.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <FiCalendar className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Réservations passées</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{pastBookings.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FiClock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Salons favoris</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">3</p>
              </div>
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                <FiHeart className="w-6 h-6 text-accent-600" />
              </div>
            </div>
          </div>
          {/* Loyalty Card */}
          <div className="bg-gradient-to-br from-primary-600 to-accent-600 rounded-2xl p-6 shadow-sm text-white">
            <div className="flex items-center justify-between mb-3">
              <FiGift className="w-8 h-8" />
              <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Programme fidélité</span>
            </div>
            <p className="text-primary-100 text-sm mb-1">Prochain service gratuit</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{pastBookings.length}</span>
              <span className="text-primary-200">/ {loyaltyConfig.bookingsForReward}</span>
            </div>
            <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${Math.min((pastBookings.length / loyaltyConfig.bookingsForReward) * 100, 100)}%` }}
              />
            </div>
            {pastBookings.length >= loyaltyConfig.bookingsForReward && (
              <p className="mt-2 text-sm text-yellow-300 font-medium">🎉 Service gratuit disponible !</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <div className="flex">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`flex-1 py-4 text-center font-medium transition-colors ${
                  activeTab === 'upcoming'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                À venir ({upcomingBookings.length})
              </button>
              <button
                onClick={() => setActiveTab('past')}
                className={`flex-1 py-4 text-center font-medium transition-colors ${
                  activeTab === 'past'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Historique ({pastBookings.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'upcoming' ? (
              upcomingBookings.length > 0 ? (
                <div className="grid gap-6">
                  {upcomingBookings.map(booking => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiCalendar className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Aucune réservation à venir
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Découvrez nos salons partenaires et réservez votre prochain rendez-vous
                  </p>
                  <Link
                    to="/salons"
                    className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                  >
                    Explorer les salons
                  </Link>
                </div>
              )
            ) : (
              pastBookings.length > 0 ? (
                <div className="grid gap-6">
                  {pastBookings.map(booking => (
                    <BookingCard key={booking.id} booking={{ ...booking, status: 'completed' }} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiClock className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Aucun historique
                  </h3>
                  <p className="text-gray-500">
                    Vos réservations passées apparaîtront ici
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Annuler la réservation"
      >
        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-amber-800 font-medium text-sm flex items-center gap-2">
              <span>⚠️</span>
              Politique d'annulation
            </p>
            <p className="text-amber-700 text-sm mt-2">
              Si vous annulez moins de <strong>30 minutes</strong> après la confirmation de votre réservation, 
              votre acompte sera intégralement remboursé.
            </p>
            <p className="text-amber-700 text-sm mt-1">
              Au-delà de 30 minutes, <strong>l'acompte n'est pas remboursable</strong>.
            </p>
          </div>
          <p className="text-gray-600 mb-6">
            Êtes-vous sûr de vouloir annuler cette réservation ? 
            Cette action est irréversible.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setShowCancelModal(false)}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Non, garder
            </button>
            <button
              onClick={handleCancelBooking}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
            >
              Oui, annuler
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ClientDashboard

