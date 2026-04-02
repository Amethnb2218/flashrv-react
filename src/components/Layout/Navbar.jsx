import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FiMenu, FiX, FiUser, FiLogOut, FiCalendar, FiSettings, FiSearch, FiHeart, FiHome, FiScissors, FiShoppingBag, FiBell, FiShoppingCart, FiTrash2 } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '../UI/Logo'
import apiFetch from '../../api/client'

import { connectRealtime, subscribeRealtime } from '../../utils/realtime'
import {
  getSiteNotifications,
  markAllSiteNotificationsRead,
  markSiteNotificationRead,
  removeSiteNotification,
  removeMatchingSiteNotifications,
  subscribeSiteNotifications,
} from '../../utils/siteNotifications'
import {
  deriveDeliveryConfigFromItems,
  getCartCount,
  readCart,
  subscribeCart,
} from '../../utils/cartStore'
import { getProRedirectPath, isProUser } from '../../utils/proOnboarding'
import { ADMIN_PATH } from '../../utils/adminPath'

const normalizeNotificationDateToken = (rawValue) => {
  const value = String(rawValue || '').trim()
  if (!value) return ''

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  const frMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (frMatch) return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`

  return value.toLowerCase()
}

const getNotificationSemanticKey = (notification) => {
  const message = String(notification?.message || '')
  const normalized = message.toLowerCase()
  const bookingMatch = normalized.match(/reservation\s+(?:confirmee|enregistree)\s+chez\s+(.+?)\s+le\s+(.+?)\s+a\s+(\d{2}:\d{2})/)

  if (bookingMatch) {
    const salon = bookingMatch[1].trim()
    const date = normalizeNotificationDateToken(bookingMatch[2])
    const time = bookingMatch[3]
    return `booking:${salon}:${date}:${time}`
  }

  return `raw:${normalized}`
}

const getNotificationPriority = (notification) => {
  const message = String(notification?.message || '').toLowerCase()
  if (message.includes('paiement au salon')) return 3
  if (message.includes('reservation confirmee')) return 2
  if (message.includes('reservation enregistree')) return 1
  return 0
}

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [cartCount, setCartCount] = useState(() => getCartCount())
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const userKey = user?.id || user?.email || 'anonymous'
  const notificationUserKeys = useMemo(
    () =>
      Array.from(
        new Set([user?.id, user?.email, userKey, 'anonymous'].filter(Boolean).map((k) => String(k)))
      ),
    [user?.email, user?.id, userKey]
  )
  const searchParams = new URLSearchParams(location.search)
  const isBoutiquePage = location.pathname === '/salons' && searchParams.get('businessType') === 'BOUTIQUE'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
    setIsOpen(false)
    navigate('/')
  }

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false)
    setShowNotifications(false)
    setShowUserMenu(false)
  }, [location.pathname, location.search])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    setCartCount(getCartCount())
    const unsubscribe = subscribeCart(() => setCartCount(getCartCount()))
    return unsubscribe
  }, [])

  const closeDrawer = useCallback(() => setIsOpen(false), [])
  const getDashboardPath = useCallback(() => {
    if (!isAuthenticated) return '/login'
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return ADMIN_PATH
    if (isProUser(user)) return getProRedirectPath(user) || '/pro/onboarding'
    return '/dashboard'
  }, [isAuthenticated, user])

  const openNotificationsPage = useCallback(() => {
    closeDrawer()
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (isProUser(user)) {
      const proPath = getProRedirectPath(user) || '/pro/onboarding'
      if (proPath === '/pro/dashboard') {
        navigate('/pro/dashboard', {
          state: {
            dashboardTab: 'appointments',
            focusNotifications: true,
            source: 'mobile-notifications',
            ts: Date.now(),
          },
        })
        return
      }
      navigate(proPath)
      return
    }
    navigate('/dashboard?tab=notifications')
  }, [closeDrawer, isAuthenticated, navigate, user])

  const openCart = useCallback(() => {
    closeDrawer()
    const cartState = readCart()
    const items = Array.isArray(cartState?.items) ? cartState.items : []
    if (items.length === 0 || !cartState?.salon?.id) {
      navigate('/cart')
      return
    }

    const delivery = deriveDeliveryConfigFromItems(items)
    navigate('/order/checkout', {
      state: {
        cart: items,
        salon: cartState.salon,
        deliveryMode: delivery.canDeliverAll ? 'DELIVERY' : 'PICKUP',
        deliveryAddress: '',
        clientPhone: user?.phoneNumber || user?.phone || '',
        clientName: user?.name || '',
        notes: '',
        forcePickup: !delivery.canDeliverAll,
        deliveryZones: delivery.deliveryZones,
        minDeliveryFee: delivery.minDeliveryFee,
      },
    })
  }, [closeDrawer, navigate, user?.name, user?.phone, user?.phoneNumber])

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([])
      return
    }

    const localMap = new Map()
    notificationUserKeys.forEach((key) => {
      getSiteNotifications(key, 20).forEach((notif) => {
        if (!localMap.has(notif.id)) localMap.set(notif.id, notif)
      })
    })
    const local = Array.from(localMap.values())

    try {
      const res = await apiFetch('/notifications')
      const data = res?.data ?? res?.data?.data ?? res
      const remote = Array.isArray(data)
        ? data
        : Array.isArray(data?.notifications)
          ? data.notifications
          : Array.isArray(res?.data?.notifications)
            ? res.data.notifications
            : []
      const merged = [...remote, ...local]
      const dedup = new Map()
      merged.forEach((n) => {
        const id = String(n.id || `${n.message}-${n.createdAt}`)
        const normalizedNotification = { ...n, id }
        const semanticKey = getNotificationSemanticKey(normalizedNotification)
        const current = dedup.get(semanticKey)
        if (!current) {
          dedup.set(semanticKey, normalizedNotification)
          return
        }

        const currentPriority = getNotificationPriority(current)
        const nextPriority = getNotificationPriority(normalizedNotification)
        const shouldReplace =
          nextPriority > currentPriority ||
          (
            nextPriority === currentPriority &&
            String(current.id).startsWith('local-') &&
            !String(normalizedNotification.id).startsWith('local-')
          )

        if (shouldReplace) {
          dedup.set(semanticKey, normalizedNotification)
        }
      })
      setNotifications(
        Array.from(dedup.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 20)
      )
    } catch (_) {
      setNotifications(local)
    }
  }, [isAuthenticated, notificationUserKeys])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    const unsubscribeLocal = subscribeSiteNotifications(fetchNotifications)

    connectRealtime()
    const unsubscribeRealtime = subscribeRealtime((event) => {
      const type = String(event?.type || '').toLowerCase()
      if (
        type.includes('notification') ||
        type.includes('order') ||
        type.includes('appointment') ||
        type === 'realtime:open'
      ) {
        fetchNotifications()
      }
    })

    return () => {
      clearInterval(interval)
      unsubscribeLocal?.()
      unsubscribeRealtime?.()
    }
  }, [isAuthenticated, fetchNotifications])

  const unreadCount = notifications.filter(n => !n.isRead).length
  const visibleCartCount = isAuthenticated ? cartCount : 0
  const showCartBadge = isAuthenticated ? visibleCartCount > 0 : true

  const markNotificationRead = async (id) => {
    if (String(id).startsWith('local-')) {
      notificationUserKeys.forEach((key) => markSiteNotificationRead(id, key))
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      return
    }
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch (_) { /* silent */ }
  }

  const markAllRead = async () => {
    notificationUserKeys.forEach((key) => markAllSiteNotificationsRead(key))
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' })
    } catch (_) {
      // ignore if endpoint is unavailable
    }
  }

  const deleteNotification = async (event, notification) => {
    event.stopPropagation()

    const previousNotifications = notifications
    const semanticKey = getNotificationSemanticKey(notification)
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id))

    if (String(notification.id).startsWith('local-')) {
      notificationUserKeys.forEach((key) => removeSiteNotification(notification.id, key))
      return
    }

    try {
      await apiFetch(`/notifications/${notification.id}`, { method: 'DELETE' })
      notificationUserKeys.forEach((key) => {
        removeMatchingSiteNotifications(key, (localNotification) =>
          getNotificationSemanticKey(localNotification) === semanticKey
        )
      })
    } catch (_) {
      setNotifications(previousNotifications)
    }
  }

  const isSalonPage = location.pathname === '/salons' && searchParams.get('businessType') !== 'BOUTIQUE'

  const navLinks = [
    { to: '/', label: 'Accueil' },
    { to: '/salons?businessType=SALON', label: 'Salons' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 dark:bg-[#1a120b]">
      {/* Main navbar */}
      <div className={`transition-all duration-300 ${isScrolled
        ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-primary-100/70 dark:!bg-[#1a120b] dark:border-[#62462a] dark:shadow-black/40'
        : 'bg-white shadow-sm border-b border-primary-100/70 dark:!bg-[#1a120b] dark:border-[#62462a]'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[86px] md:h-14">
            {/* Brand logo */}
            <div className="min-w-0">
              <div className="hidden xl:block">
                <Logo variant="default" size="md" />
              </div>
              <div className="xl:hidden max-w-[calc(100vw-6rem)]">
                <Logo variant="default" size="xl" forceIconText />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden xl:flex items-center space-x-2">
              {navLinks.map(link => {
                const isSalonLink = link.to.includes('businessType=SALON')
                const active = isSalonLink ? (isSalonPage && !isBoutiquePage) : (location.pathname === link.to)
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`
                    inline-flex h-10 items-center justify-center px-4 rounded-none border text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2
                    ${active
                        ? 'border-[#e4cba8] bg-[#fff8ee] text-[#2a1808] shadow-sm dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3]'
                        : 'border-[#e4cba8] bg-[#fff8ee] text-[#2a1808] hover:bg-[#fff2df] dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:hover:bg-[#352214]'
                      }
                  `}
                  >
                    {link.label}
                  </Link>
                )
              })}

              <Link
                to="/salons?businessType=BOUTIQUE"
                className={`inline-flex h-10 items-center justify-center px-4 rounded-none border text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 ${isBoutiquePage
                  ? 'border-[#e4cba8] bg-[#fff8ee] text-[#2a1808] shadow-sm dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3]'
  : 'border-[#e4cba8] bg-[#fff8ee] text-[#2a1808] hover:bg-[#fff2df] dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:hover:bg-[#352214]'
                  }`}
              >
                Boutiques
              </Link>
            </div>

            {/* Right side */}
            <div className="hidden xl:flex items-center space-x-2">
              <button
                onClick={() => isAuthenticated ? navigate('/dashboard?tab=favorites') : navigate('/login')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-none border border-[#e4cba8] bg-[#fff8ee] text-[#2a1808] transition-all hover:bg-[#fff2df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:hover:bg-[#352214] dark:focus-visible:ring-offset-black"
                title="Mes favoris"
              >
                <FiHeart className="w-5 h-5" />
              </button>

              <button
                onClick={openCart}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-none border border-[#e4cba8] bg-[#fff8ee] text-[#2a1808] transition-all hover:bg-[#fff2df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:hover:bg-[#352214] dark:focus-visible:ring-offset-black"
                title="Panier"
              >
                <FiShoppingCart className="w-5 h-5" />
                {showCartBadge && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gold-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                    {visibleCartCount > 9 ? '9+' : visibleCartCount}
                  </span>
                )}
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      navigate('/login')
                      return
                    }
                    setShowNotifications(!showNotifications)
                    setShowUserMenu(false)
                  }}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-none border border-[#ead7ba] bg-white text-[#2a1808] transition-all hover:bg-[#fff2df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:hover:bg-[#352214] dark:focus-visible:ring-offset-black"
                  title="Notifications"
                >
                  <FiBell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isAuthenticated && showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#24160d] rounded-xl shadow-xl border border-primary-100 dark:border-[#7a5932] overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 border-b border-primary-100 dark:border-[#7a5932] flex items-center justify-between">
                        <h3 className="font-bold text-primary-900 dark:text-white">Notifications</h3>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <span className="text-xs bg-gold-100 dark:bg-[#3a2616] text-gold-700 dark:text-[#fff4e3] px-2 py-0.5 rounded-full font-medium">{unreadCount} nouvelles</span>
                          )}
                          {notifications.length > 0 && (
                            <button
                              type="button"
                              onClick={markAllRead}
                              className="text-xs text-primary-500 dark:text-white/80 hover:text-primary-800 dark:hover:text-white underline"
                            >
                              Tout marquer lu
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-primary-400 dark:text-[#d6b081] text-sm">
                            Aucune notification
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              onClick={() => markNotificationRead(n.id)}
                              className={`px-4 py-3 border-b border-primary-50 dark:border-[#7a5932] cursor-pointer hover:bg-primary-50 dark:hover:bg-[#2b1b0f] transition ${!n.isRead ? 'bg-gold-50/50 dark:bg-gold-500/10' : ''
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-primary-800 dark:text-[#f3d8ad]">{n.message}</p>
                                  <p className="text-xs text-primary-400 dark:text-[#d6b081] mt-1">
                                    {new Date(n.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(event) => deleteNotification(event, n)}
                                  className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-primary-400 dark:text-[#d6b081] transition hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300"
                                  aria-label="Supprimer la notification"
                                  title="Supprimer"
                                >
                                  <FiTrash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="h-10 w-px bg-[#ead7ba] dark:bg-[#62462a]"></div>

              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false) }}
                    className="inline-flex h-10 items-center gap-2 rounded-none border border-[#ead7ba] bg-white px-4 text-[#2a1808] transition-all hover:bg-[#fff2df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:hover:bg-[#352214] dark:focus-visible:ring-offset-black"
                  >
                    {(user.avatar || user.picture) ? (
                      <img
                        src={user.avatar || user.picture}
                        alt={user.name}
                        className="h-7 w-7 rounded-full border border-[#ead7ba] object-cover shadow-sm dark:border-[#7a5932]"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2a1808] text-[#fff4e3] dark:bg-[#ffd978] dark:text-[#2a1808]">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <FiUser className="h-4 w-4" />
                    <span className="font-medium text-sm">
                      Mon compte
                    </span>
                    <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#24160d] rounded-xl shadow-xl py-2 border border-primary-100 dark:border-[#7a5932]"
                      >
                        <div className="px-4 py-3 border-b border-primary-100 dark:border-[#7a5932]">
                          <p className="font-medium text-primary-800 dark:text-white">{user.name}</p>
                          <p className="text-sm text-primary-500 dark:text-[#d6b081]">{user.email}</p>
                        </div>

                        <Link
                          to={user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? ADMIN_PATH : isProUser(user) ? (getProRedirectPath(user) || '/pro/onboarding') : '/dashboard'}
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center space-x-2 px-4 py-2 text-primary-600 dark:text-[#f3d8ad] hover:bg-primary-50 dark:hover:bg-[#2b1b0f] hover:text-primary-900 dark:hover:text-[#fff4e3] transition-colors"
                        >
                          <FiCalendar className="w-4 h-4" />
                          <span>{user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? 'Dashboard admin' : user.role === 'PRO' ? 'Mon dashboard' : 'Mes réservations'}</span>
                        </Link>

                        <Link
                          to="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center space-x-2 px-4 py-2 text-primary-600 dark:text-[#f3d8ad] hover:bg-primary-50 dark:hover:bg-[#2b1b0f] hover:text-primary-900 dark:hover:text-[#fff4e3] transition-colors"
                        >
                          <FiSettings className="w-4 h-4" />
                          <span>Paramètres</span>
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 w-full transition-colors"
                        >
                          <FiLogOut className="w-4 h-4" />
                          <span>Déconnexion</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/login"
                   className="inline-flex h-10 items-center justify-center rounded-none border border-[#e4cba8] bg-[#fff8ee] px-4 text-sm font-medium text-[#2a1808] transition-all hover:bg-[#fff2df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:hover:bg-[#352214] dark:focus-visible:ring-offset-black"
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-none border border-[#9d4f0d] px-5 py-2.5 bg-gradient-to-r from-primary-700 via-primary-500 to-gold-500 text-white font-semibold hover:shadow-lg transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:bg-none dark:text-[#fff4e3] dark:hover:bg-[#352214] dark:focus-visible:ring-offset-black"
                  >
                    S'inscrire gratuitement
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="xl:hidden p-2 rounded-lg text-primary-700 dark:text-[#fff4e3] hover:bg-primary-100 dark:hover:bg-[#2b1b0f] transition-colors flex-shrink-0"
              aria-label="Ouvrir le menu"
            >
              {isOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer - rendered via Portal outside nav for stable positioning */}
      {createPortal(
        <AnimatePresence mode="wait">
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm xl:hidden"
                onClick={closeDrawer}
              />

              {/* Drawer panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed top-0 right-0 bottom-0 z-[9999] w-[82%] max-w-sm bg-white dark:bg-[#24160d] shadow-2xl xl:hidden flex flex-col border-l border-primary-100 dark:border-[#62462a]"
              >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-primary-100 dark:border-[#62462a]">
                  <Logo variant="default" size="sm" />
                  <button
                    onClick={closeDrawer}
                    className="p-2 rounded-xl text-primary-500 dark:text-[#f3d8ad] hover:bg-primary-100 dark:hover:bg-[#2b1b0f] transition-colors"
                    aria-label="Fermer le menu"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer body */}
                <div className="flex-1 overflow-y-auto py-4 px-4">
                  {/* Navigation links */}
                  <div className="space-y-1">
                    <NavLink
                      to="/"
                      end
                      onClick={closeDrawer}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive
                          ? 'bg-gold-50 dark:bg-[#3a2616] text-gold-700 dark:text-[#fff4e3]'
                          : 'text-primary-700 dark:text-[#f3d8ad] hover:bg-primary-50 dark:hover:bg-[#2b1b0f]'
                        }`
                      }
                    >
                      <FiHome className="w-5 h-5" />
                      Accueil
                    </NavLink>
                    <Link
                      to="/salons?businessType=SALON"
                      onClick={closeDrawer}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isSalonPage && !isBoutiquePage
                        ? 'bg-gold-50 dark:bg-[#3a2616] text-gold-700 dark:text-[#fff4e3]'
                        : 'text-primary-700 dark:text-[#f3d8ad] hover:bg-primary-50 dark:hover:bg-[#2b1b0f]'
                        }`}
                    >
                      <FiScissors className="w-5 h-5" />
                      Salons
                    </Link>
                    <Link
                      to="/salons?businessType=BOUTIQUE"
                      onClick={closeDrawer}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isBoutiquePage
                        ? 'bg-gold-50 dark:bg-[#3a2616] text-gold-700 dark:text-[#fff4e3]'
                        : 'text-primary-700 dark:text-[#f3d8ad] hover:bg-primary-50 dark:hover:bg-[#2b1b0f]'
                        }`}
                    >
                      <FiShoppingBag className="w-5 h-5" />
                      Boutiques
                    </Link>
                  </div>

                  {/* Divider */}
                  <div className="my-4 border-t border-primary-100 dark:border-[#62462a]" />
                  {/* User section */}
                  {isAuthenticated ? (
                    <div className="space-y-1">
                      {/* User info */}
                      <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        {(user.avatar || user.picture) ? (
                          <img
                            src={user.avatar || user.picture}
                            alt={user.name}
                            className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-primary-900 dark:text-white text-sm truncate">{user.name}</p>
                          <p className="text-xs text-primary-500 dark:text-[#d6b081] truncate">{user.email}</p>
                        </div>
                      </div>

                      <Link
                        to={user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? ADMIN_PATH : isProUser(user) ? (getProRedirectPath(user) || '/pro/onboarding') : '/dashboard'}
                        onClick={closeDrawer}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-primary-700 dark:text-[#f3d8ad] hover:bg-primary-50 dark:hover:bg-[#2b1b0f] transition-colors"
                      >
                        <FiCalendar className="w-5 h-5" />
                        <span>{user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? 'Dashboard admin' : user.role === 'PRO' ? 'Mon dashboard' : 'Mes réservations'}</span>
                      </Link>
                      <button
                        onClick={openNotificationsPage}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-primary-700 dark:text-[#f3d8ad] hover:bg-primary-50 dark:hover:bg-[#2b1b0f] transition-colors w-full"
                      >
                        <div className="relative">
                          <FiBell className="w-5 h-5" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </div>
                        <span>Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}</span>
                      </button>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllRead}
                          className="ml-4 inline-flex rounded-lg px-3 py-2 text-xs font-medium text-primary-500 dark:text-[#f3d8ad] transition-colors hover:bg-primary-50 dark:hover:bg-[#2b1b0f] hover:text-primary-800 dark:hover:text-[#fff4e3]"
                        >
                          Tout marquer lu
                        </button>
                      )}
                      <button
                        onClick={openCart}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-primary-700 dark:text-[#f3d8ad] hover:bg-primary-50 dark:hover:bg-[#2b1b0f] transition-colors w-full"
                      >
                        <div className="relative">
                          <FiShoppingCart className="w-5 h-5" />
                          {showCartBadge && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                              {visibleCartCount > 9 ? '9+' : visibleCartCount}
                            </span>
                          )}
                        </div>
                        <span>Panier ({visibleCartCount})</span>
                      </button>
                      <Link
                        to="/dashboard?tab=favorites"
                        onClick={closeDrawer}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-primary-700 dark:text-[#f3d8ad] hover:bg-primary-50 dark:hover:bg-[#2b1b0f] transition-colors"
                      >
                        <FiHeart className="w-5 h-5 text-red-400" />
                        <span>Mes favoris</span>
                      </Link>
                      <Link
                        to="/profile"
                        onClick={closeDrawer}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-primary-700 dark:text-[#f3d8ad] hover:bg-primary-50 dark:hover:bg-[#2b1b0f] transition-colors"
                      >
                        <FiSettings className="w-5 h-5" />
                        <span>Paramètres</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2 px-1">
                      <Link
                        to="/login"
                        onClick={closeDrawer}
                        className="block py-2.5 px-4 text-center text-sm font-semibold text-primary-700 dark:text-[#fff4e3] hover:bg-primary-50 dark:hover:bg-[#2b1b0f] rounded-xl transition-colors border border-primary-200 dark:border-[#7a5932]"
                      >
                        Connexion
                      </Link>
                      <Link
                        to="/register"
                        onClick={closeDrawer}
                        className="block py-2.5 px-4 text-center text-sm font-semibold bg-primary-900 dark:bg-gold-500 text-white dark:text-primary-900 rounded-xl hover:bg-primary-800 dark:hover:bg-gold-400 transition-colors"
                      >
                        S'inscrire gratuitement
                      </Link>
                    </div>
                  )}
                </div>

                {/* Drawer footer - logout */}
                {isAuthenticated && (
                  <div className="border-t border-primary-100 dark:border-[#62462a] px-4 py-4">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <FiLogOut className="w-5 h-5" />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </nav>
  )
}

export default Navbar


