import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FiCalendar, FiClock, FiMapPin, FiStar, FiMoreVertical, 
  FiX, FiRefreshCw, FiHeart, FiSettings, FiChevronRight, FiChevronDown,
  FiGift, FiAward, FiPercent, FiMessageCircle, FiShoppingBag, FiPackage
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { loyaltyConfig } from '../../data/salons'
import Modal from '../../components/UI/Modal'
import apiFetch from '@/api/client'
import { resolveMediaUrl } from '../../utils/media'
import AppointmentChatModal from '../../components/Chat/AppointmentChatModal'
import toast from 'react-hot-toast'
import { pushSiteNotification } from '../../utils/siteNotifications'

function ClientDashboard() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'upcoming'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [bookings, setBookings] = useState([])
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [chatBooking, setChatBooking] = useState(null)
  const [showChatModal, setShowChatModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [cancellingOrderId, setCancellingOrderId] = useState(null)
  const [expandedBookingId, setExpandedBookingId] = useState(null)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [visibleBookings, setVisibleBookings] = useState(8)

  const getSalonImage = (salon) => {
    if (!salon) return ''
    if (salon.image) return resolveMediaUrl(salon.image)
    if (Array.isArray(salon.gallery) && salon.gallery.length > 0) {
      const first = salon.gallery[0]
      return resolveMediaUrl(first?.media || first?.url)
    }
    if (Array.isArray(salon.images) && salon.images.length > 0) {
      return resolveMediaUrl(salon.images[0])
    }
    return ''
  }

  useEffect(() => {
    let mounted = true
    const loadBookings = async () => {
      if (!user) return
      setLoading(true)
      try {
        const res = await apiFetch('/appointments?scope=client')
        const data = res?.data ?? res
        const list = Array.isArray(data) ? data : (data?.appointments || [])
        const mapped = list.map((appt) => ({
          id: appt.id,
          date: appt.date,
          time: appt.startTime,
          totalPrice: appt.totalPrice ?? appt.service?.price ?? 0,
          status: appt.status,
          salon: appt.salon,
          services: appt.service ? [appt.service] : [],
        }))
        if (mounted) setBookings(mapped)
      } catch (e) {
        if (mounted) setBookings([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadBookings()
    return () => {
      mounted = false
    }
  }, [user])

  // Fetch orders
  useEffect(() => {
    if (!user) return
    let mounted = true
    const loadOrders = async () => {
      setOrdersLoading(true)
      try {
        const res = await apiFetch('/orders?scope=client')
        const data = res?.data ?? res
        if (mounted) setOrders(Array.isArray(data) ? data : (data?.orders || []))
      } catch (_) {
        if (mounted) setOrders([])
      } finally {
        if (mounted) setOrdersLoading(false)
      }
    }
    loadOrders()
    return () => { mounted = false }
  }, [user])

  const handleCancelOrder = async (orderId) => {
    setCancellingOrderId(orderId)
    try {
      await apiFetch(`/orders/${orderId}/status`, { method: 'PATCH', body: { status: 'CANCELLED' } })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o))
      toast.success('Commande annulée')
      pushSiteNotification({
        userId: user?.id || user?.email,
        type: 'order_cancelled',
        message: `Votre commande ${orderId} a été annulée avec succès.`,
        meta: { orderId },
      })
    } catch (e) {
      toast.error(e.message || 'Erreur lors de l\'annulation')
    } finally {
      setCancellingOrderId(null)
    }
  }

  const orderStatusLabels = {
    PENDING: { label: 'En attente', className: 'bg-gold-100 text-yellow-700' },
    CONFIRMED: { label: 'Confirmée', className: 'bg-blue-100 text-blue-700' },
    PREPARING: { label: 'En préparation', className: 'bg-purple-100 text-purple-700' },
    READY: { label: 'Prête', className: 'bg-green-100 text-green-700' },
    DELIVERED: { label: 'Livrée', className: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Annulée', className: 'bg-red-100 text-red-700' },
  }

  const now = new Date()
  const getBookingDateTime = (booking) => {
    const base = new Date(booking.date)
    if (!booking.time || isNaN(base.getTime())) return base
    const [h, m] = String(booking.time).split(':').map(Number)
    if (Number.isFinite(h)) {
      base.setHours(h, Number.isFinite(m) ? m : 0, 0, 0)
    }
    return base
  }
  const upcomingBookings = bookings.filter(b => {
    const status = String(b.status || '').toUpperCase()
    const isPast = getBookingDateTime(b) < now
    const isCancelled = ['CANCELLED', 'NO_SHOW'].includes(status)
    return !isPast && !isCancelled
  })
  const pastBookings = bookings.filter(b => {
    const status = String(b.status || '').toUpperCase()
    return getBookingDateTime(b) < now || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status)
  })
  const favoriteSalonsCount = new Set(bookings.map(b => b.salon?.id).filter(Boolean)).size

  // Liked products from localStorage
  const likedProductIds = useMemo(() => {
    try {
      const raw = localStorage.getItem('flashrv_liked_products')
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [activeTab])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'favorites') {
      setSearchParams({ tab: 'favorites' })
    } else {
      searchParams.delete('tab')
      setSearchParams(searchParams)
    }
  }

  const handleCancelBooking = async () => {
    if (!selectedBooking) return
    try {
      await apiFetch(`/appointments/${selectedBooking.id}/status`, {
        method: 'PATCH',
        body: { status: 'CANCELLED' },
      })
      setBookings((prev) =>
        prev.map((b) => (b.id === selectedBooking.id ? { ...b, status: 'CANCELLED' } : b))
      )
    } catch (e) {
      // silent for now
    } finally {
      setShowCancelModal(false)
      setSelectedBooking(null)
    }
  }

  const openFloatingChat = () => {
    const preferred = upcomingBookings[0] || bookings[0] || pastBookings[0]
    if (!preferred) {
      toast.error('Aucune réservation disponible pour ouvrir le chat.')
      return
    }
    setChatBooking(preferred)
    setShowChatModal(true)
  }

  const getStatusBadge = (status) => {
    const key = String(status || '').toUpperCase()
    const styles = {
      CONFIRMED: 'bg-green-100 text-green-700',
      CONFIRMED_ON_SITE: 'bg-green-100 text-green-700',
      PAID: 'bg-emerald-100 text-emerald-700',
      PENDING: 'bg-gold-100 text-yellow-700',
      PENDING_PAYMENT: 'bg-gold-100 text-gold-700',
      PENDING_ASSIGNMENT: 'bg-gold-100 text-yellow-700',
      IN_PROGRESS: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-red-100 text-red-700',
      NO_SHOW: 'bg-red-100 text-red-700',
      COMPLETED: 'bg-primary-100 text-primary-700',
    }
    const labels = {
      CONFIRMED: 'Confirmée',
      CONFIRMED_ON_SITE: 'Confirmée (sur place)',
      PAID: 'Payée',
      PENDING: 'En attente',
      PENDING_PAYMENT: 'En attente de paiement',
      PENDING_ASSIGNMENT: 'En attente d\'assignation',
      IN_PROGRESS: 'En cours',
      CANCELLED: 'Annulée',
      NO_SHOW: 'Absence',
      COMPLETED: 'Terminée',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ring-1 ring-inset ring-black/5 ${styles[key] || styles.CONFIRMED}`}>
        {labels[key] || status}
      </span>
    )
  }

  const BookingCard = ({ booking }) => {
    const isExpanded = expandedBookingId === booking.id
    const canAct = ['PENDING', 'PENDING_PAYMENT', 'PENDING_ASSIGNMENT', 'CONFIRMED', 'CONFIRMED_ON_SITE', 'PAID'].includes(String(booking.status || '').toUpperCase()) && new Date(booking.date) >= new Date()
    const isCompleted = String(booking.status || '').toUpperCase() === 'COMPLETED'

    return (
      <div className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden">
        {/* Compact header row */}
        <button
          type="button"
          onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
          className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-primary-50 transition"
        >
          {getSalonImage(booking.salon) ? (
            <img src={getSalonImage(booking.salon)} alt={booking.salon?.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs shrink-0">
              {booking.salon?.name?.charAt(0) || 'S'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-primary-900 text-sm truncate">{booking.salon?.name}</span>
              <span className="text-xs text-primary-400 truncate">{booking.services?.map(s => s.name).join(', ') || ''}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-primary-500 flex items-center gap-1">
                <FiCalendar className="w-3 h-3" />
                {new Date(booking.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
              <span className="text-xs text-primary-500 flex items-center gap-1">
                <FiClock className="w-3 h-3" /> {booking.time || '—'}
              </span>
              <span className="font-bold text-gold-600 text-sm">{booking.totalPrice?.toLocaleString()} FCFA</span>
            </div>
          </div>
          {getStatusBadge(booking.status)}
          <FiChevronDown className={`w-4 h-4 text-primary-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 border-t border-primary-100 pt-2.5 space-y-2">
                {/* Location */}
                {(booking.salon?.address || booking.salon?.city) && (
                  <p className="text-xs text-primary-500 flex items-center gap-1">
                    <FiMapPin className="w-3 h-3" /> {booking.salon.address || booking.salon.city}
                  </p>
                )}

                {/* Services */}
                {booking.services?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {booking.services.map(service => (
                      <span key={service.id} className="px-2.5 py-1 bg-primary-50 text-primary-600 rounded-full text-xs">
                        {service.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {canAct && (
                    <>
                      <button
                        onClick={() => { setSelectedBooking(booking); setShowCancelModal(true) }}
                        className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium"
                      >
                        <FiX className="inline w-3 h-3 mr-1" /> Annuler
                      </button>
                      <button className="px-3 py-1.5 border border-primary-300 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors text-xs font-medium">
                        <FiRefreshCw className="inline w-3 h-3 mr-1" /> Modifier
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { setChatBooking(booking); setShowChatModal(true) }}
                    className="px-3 py-1.5 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors text-xs font-medium"
                  >
                    <FiMessageCircle className="inline w-3 h-3 mr-1" /> Chat
                  </button>
                  {isCompleted && (
                    <button className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-gold-100 transition-colors text-xs font-medium">
                      <FiStar className="inline w-3 h-3 mr-1" /> Avis
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gold-50/20 pt-4 sm:pt-8 pb-28 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-primary-900">
              Bonjour, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-primary-500 mt-0.5 text-xs sm:text-sm hidden sm:block">
              {loading ? 'Chargement...' : 'Gérez vos réservations et votre compte'}
            </p>
          </div>
          <Link
            to="/salons"
            className="inline-flex items-center px-3 py-1.5 sm:px-5 sm:py-2.5 bg-primary-900 hover:bg-primary-800 text-white font-semibold rounded-lg sm:rounded-xl transition-colors text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Nouvelle réservation</span>
            <span className="sm:hidden">Réserver</span>
            <FiChevronRight className="ml-1 w-4 h-4" />
          </Link>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <div className="bg-white rounded-xl sm:rounded-2xl p-2 sm:p-5 shadow-sm border border-primary-100 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-1 sm:gap-0">
              <div>
                <p className="text-primary-500 text-[10px] sm:text-sm leading-tight">À venir</p>
                <p className="text-base sm:text-2xl font-bold text-primary-900">{loading ? '—' : upcomingBookings.length}</p>
              </div>
              <div className="hidden sm:flex w-10 h-10 bg-primary-100 rounded-xl items-center justify-center">
                <FiCalendar className="w-5 h-5 text-primary-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl p-2 sm:p-5 shadow-sm border border-primary-100 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-1 sm:gap-0">
              <div>
                <p className="text-primary-500 text-[10px] sm:text-sm leading-tight">Passées</p>
                <p className="text-base sm:text-2xl font-bold text-primary-900">{loading ? '—' : pastBookings.length}</p>
              </div>
              <div className="hidden sm:flex w-10 h-10 bg-green-100 rounded-xl items-center justify-center">
                <FiClock className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl p-2 sm:p-5 shadow-sm border border-primary-100 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-1 sm:gap-0">
              <div>
                <p className="text-primary-500 text-[10px] sm:text-sm leading-tight">Favoris</p>
                <p className="text-base sm:text-2xl font-bold text-primary-900">{loading ? '—' : favoriteSalonsCount}</p>
              </div>
              <div className="hidden sm:flex w-10 h-10 bg-pink-100 rounded-xl items-center justify-center">
                <FiHeart className="w-5 h-5 text-accent-600" />
              </div>
            </div>
          </div>
          {/* Loyalty Card */}
          <div className="bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl sm:rounded-2xl p-2 sm:p-5 shadow-sm text-white text-center sm:text-left">
            <FiGift className="w-5 h-5 sm:w-7 sm:h-7 mx-auto sm:mx-0" />
            <div className="flex items-baseline gap-0.5 justify-center sm:justify-start mt-0.5">
              <span className="text-base sm:text-2xl font-bold">{pastBookings.length}</span>
              <span className="text-primary-200 text-[10px] sm:text-sm">/{loyaltyConfig.bookingsForReward}</span>
            </div>
            <div className="mt-1 sm:mt-2 h-1 sm:h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${Math.min((pastBookings.length / loyaltyConfig.bookingsForReward) * 100, 100)}%` }}
              />
            </div>
            <p className="hidden sm:block text-primary-100 text-xs mt-1">Prochain service gratuit</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="sm:bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-primary-100">
          <div className="sticky top-14 z-20 bg-white border-b border-primary-200">
            <div className="flex">
              <button
                onClick={() => handleTabChange('upcoming')}
                className={`flex-1 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'upcoming'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-primary-500 hover:text-primary-700'
                }`}
              >
                À venir ({upcomingBookings.length})
              </button>
              <button
                onClick={() => handleTabChange('past')}
                className={`flex-1 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'past'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-primary-500 hover:text-primary-700'
                }`}
              >
                Historique ({pastBookings.length})
              </button>
              <button
                onClick={() => handleTabChange('orders')}
                className={`flex-1 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                  activeTab === 'orders'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-primary-500 hover:text-primary-700'
                }`}
              >
                <FiShoppingBag className="w-3.5 h-3.5" />
                Commandes ({orders.length})
              </button>
              <button
                onClick={() => handleTabChange('favorites')}
                className={`flex-1 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                  activeTab === 'favorites'
                    ? 'text-red-600 border-b-2 border-red-500'
                    : 'text-primary-500 hover:text-primary-700'
                }`}
              >
                <FiHeart className="w-3.5 h-3.5" />
                Favoris ({likedProductIds.length})
              </button>
            </div>
          </div>

          <div className="py-3 sm:p-5">
            {/* Favorites Tab */}
            {activeTab === 'favorites' ? (
              likedProductIds.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiHeart className="w-10 h-10 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-primary-900 mb-2">Aucun favori</h3>
                  <p className="text-primary-500 mb-6">Likez des articles dans les boutiques pour les retrouver ici</p>
                  <Link to="/salons?businessType=BOUTIQUE" className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors">
                    Explorer les boutiques
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-primary-500 mb-3">Vous avez {likedProductIds.length} article{likedProductIds.length > 1 ? 's' : ''} en favoris. Retrouvez-les dans les boutiques où vous les avez likés.</p>
                  <Link to="/salons?businessType=BOUTIQUE" className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors text-sm">
                    Voir les boutiques
                  </Link>
                </div>
              )
            ) :
            activeTab === 'orders' ? (
              ordersLoading ? (
                <div className="text-center py-12">
                  <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-primary-500">Chargement des commandes...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiShoppingBag className="w-10 h-10 text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-primary-900 mb-2">Aucune commande</h3>
                  <p className="text-primary-500 mb-6">Vos commandes boutique apparaîtront ici</p>
                  <Link to="/salons?businessType=BOUTIQUE" className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors">
                    Explorer les boutiques
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.map(order => {
                    const st = orderStatusLabels[order.status] || { label: order.status, className: 'bg-primary-100 text-primary-700' }
                    const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status)
                    const isOrderExpanded = expandedOrderId === order.id
                    return (
                      <div key={order.id} className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(isOrderExpanded ? null : order.id)}
                          className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-primary-50 transition"
                        >
                          <div className="w-8 h-8 bg-gold-100 rounded-lg flex items-center justify-center shrink-0">
                            <FiShoppingBag className="w-4 h-4 text-gold-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-primary-900 text-sm truncate block">{order.salon?.name || 'Boutique'}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-primary-500">
                                {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                              </span>
                              <span className="font-bold text-gold-600 text-sm">{(order.totalPrice || 0).toLocaleString()} F</span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold shrink-0 ${st.className}`}>{st.label}</span>
                          <FiChevronDown className={`w-4 h-4 text-primary-400 shrink-0 transition-transform ${isOrderExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isOrderExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 border-t border-primary-100 pt-2.5 space-y-2">
                                {(order.items || []).map((item, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span className="text-primary-700">{item.product?.name || 'Article'} × {item.quantity}</span>
                                    <span className="font-medium text-primary-900">{(item.unitPrice * item.quantity).toLocaleString()} F</span>
                                  </div>
                                ))}
                                <div className="flex items-center gap-2 pt-2 border-t border-primary-100 text-xs text-primary-500">
                                  <FiPackage className="w-3.5 h-3.5" />
                                  {order.deliveryMode === 'DELIVERY' ? 'Livraison' : 'Retrait'}
                                </div>
                                <div className="flex items-center gap-1">
                                  {['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'].map((step, i) => {
                                    const steps = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED']
                                    const currentIdx = steps.indexOf(order.status)
                                    const isDone = i <= currentIdx && order.status !== 'CANCELLED'
                                    return <div key={step} className={`flex-1 h-1 rounded-full ${isDone ? 'bg-green-500' : 'bg-primary-200'}`} />
                                  })}
                                </div>
                                {canCancel && (
                                  <button
                                    onClick={() => handleCancelOrder(order.id)}
                                    disabled={cancellingOrderId === order.id}
                                    className="w-full py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium disabled:opacity-50"
                                  >
                                    {cancellingOrderId === order.id ? 'Annulation...' : 'Annuler'}
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              )
            ) : loading ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-primary-500">Chargement des réservations...</p>
              </div>
            ) : activeTab === 'upcoming' ? (
              upcomingBookings.length > 0 ? (
                <div className="space-y-2">
                  {upcomingBookings.slice(0, visibleBookings).map(booking => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                  {upcomingBookings.length > visibleBookings && (
                    <button type="button" onClick={() => setVisibleBookings(v => v + 10)} className="w-full mt-3 py-2.5 rounded-xl border border-primary-200 text-sm font-medium text-primary-600 hover:bg-primary-50 transition">
                      Voir plus ({upcomingBookings.length - visibleBookings} restants)
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiCalendar className="w-10 h-10 text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-primary-900 mb-2">
                    Aucune réservation à venir
                  </h3>
                  <p className="text-primary-500 mb-6">
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
                <div className="space-y-2">
                  {pastBookings.slice(0, visibleBookings).map(booking => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                  {pastBookings.length > visibleBookings && (
                    <button type="button" onClick={() => setVisibleBookings(v => v + 10)} className="w-full mt-3 py-2.5 rounded-xl border border-primary-200 text-sm font-medium text-primary-600 hover:bg-primary-50 transition">
                      Voir plus ({pastBookings.length - visibleBookings} restants)
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiClock className="w-10 h-10 text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-primary-900 mb-2">
                    Aucun historique
                  </h3>
                  <p className="text-primary-500">
                    Vos réservations passées apparaîtront ici
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={openFloatingChat}
        className="fixed bottom-32 right-3 sm:bottom-20 sm:right-6 z-40 inline-flex items-center justify-center w-12 h-12 sm:w-auto sm:h-auto rounded-full bg-primary-900 sm:px-5 sm:py-3 text-sm font-semibold text-white shadow-lg shadow-primary-900/25 transition hover:bg-primary-800"
      >
        <FiMessageCircle className="h-5 w-5 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline ml-2">Chat rapide</span>
      </button>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Annuler la réservation"
      >
        <div className="p-6">
          <div className="bg-gold-50 border border-gold-200 rounded-xl p-4 mb-4">
            <p className="text-gold-800 font-medium text-sm flex items-center gap-2">
              <span>⚠️</span>
              Politique d'annulation
            </p>
            <p className="text-gold-700 text-sm mt-2">
              Si vous annulez moins de <strong>30 minutes</strong> après la confirmation de votre réservation, 
              votre acompte sera intégralement remboursé.
            </p>
            <p className="text-gold-700 text-sm mt-1">
              Au-delà de 30 minutes, <strong>l'acompte n'est pas remboursable</strong>.
            </p>
          </div>
          <p className="text-primary-600 mb-6">
            Êtes-vous sûr de vouloir annuler cette réservation ? 
            Cette action est irréversible.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setShowCancelModal(false)}
              className="flex-1 py-3 border border-primary-300 text-primary-700 rounded-xl hover:bg-primary-50 transition-colors font-medium"
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
      <AppointmentChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        appointment={chatBooking}
        currentUserId={user?.id}
      />
    </div>
  )
}

export default ClientDashboard

