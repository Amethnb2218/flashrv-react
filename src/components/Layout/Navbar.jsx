import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FiMenu, FiX, FiUser, FiLogOut, FiCalendar, FiSettings, FiSearch, FiHeart, FiHome, FiScissors, FiShoppingBag, FiBell } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '../UI/Logo'
import apiFetch from '../../api/client'
import { connectRealtime, subscribeRealtime } from '../../utils/realtime'
import {
  getSiteNotifications,
  markAllSiteNotificationsRead,
  markSiteNotificationRead,
  subscribeSiteNotifications,
} from '../../utils/siteNotifications'

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
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

  const closeDrawer = useCallback(() => setIsOpen(false), [])

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
        if (!dedup.has(id)) dedup.set(id, { ...n, id })
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

    const token = sessionStorage.getItem('flashrv_token')
    if (token) connectRealtime(token)
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

  const isSalonPage = location.pathname === '/salons' && searchParams.get('businessType') !== 'BOUTIQUE'

  const navLinks = [
    { to: '/', label: 'Accueil' },
    { to: '/salons?businessType=SALON', label: 'Salons' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Main navbar */}
      <div className={`transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg' 
          : 'bg-white shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo FlashRV' */}
            <Logo variant="default" size="md" />

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map(link => {
                const isSalonLink = link.to.includes('businessType=SALON')
                const active = isSalonLink ? (isSalonPage && !isBoutiquePage) : (location.pathname === link.to)
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`
                    px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2
                    ${active 
                      ? 'text-gray-900 bg-gray-100' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                  >
                    {link.label}
                  </Link>
                )
              })}

              <Link
                to="/salons?businessType=BOUTIQUE"
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${
                  isBoutiquePage
                    ? 'text-gray-900 bg-gray-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Boutiques
              </Link>
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center space-x-2">
              <button
                onClick={() => isAuthenticated ? navigate('/dashboard') : navigate('/login')}
                className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                title="Mes favoris"
              >
                <FiHeart className="w-5 h-5" />
              </button>

              {/* Notification Bell */}
              {isAuthenticated && (
                <div className="relative">
                  <button
                    onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false) }}
                    className="p-2.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 relative"
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
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
                      >
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                          <h3 className="font-bold text-gray-900">Notifications</h3>
                          <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{unreadCount} nouvelles</span>
                            )}
                            {notifications.length > 0 && (
                              <button
                                type="button"
                                onClick={markAllRead}
                                className="text-xs text-gray-500 hover:text-gray-800 underline"
                              >
                                Tout marquer lu
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm">
                              Aucune notification
                            </div>
                          ) : (
                            notifications.map(n => (
                              <div
                                key={n.id}
                                onClick={() => markNotificationRead(n.id)}
                                className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${
                                  !n.isRead ? 'bg-amber-50/50' : ''
                                }`}
                              >
                                <p className="text-sm text-gray-800">{n.message}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(n.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              
              <div className="h-6 w-px bg-gray-200"></div>
              
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false) }}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                  >
                    {(user.avatar || user.picture) ? (
                      <img
                        src={user.avatar || user.picture}
                        alt={user.name}
                        className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-semibold text-sm">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <span className="font-medium text-gray-700 text-sm">
                      {user.name?.split(' ')[0]}
                    </span>
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 border border-gray-100"
                      >
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="font-medium text-gray-800">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        
                        <Link
                          to={user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? '/admin' : user.role === 'PRO' ? '/pro/dashboard' : '/dashboard'}
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        >
                          <FiCalendar className="w-4 h-4" />
                          <span>{user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? 'Dashboard admin' : user.role === 'PRO' ? 'Mon dashboard' : 'Mes réservations'}</span>
                        </Link>
                        
                        <Link
                          to="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
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
                    className="px-4 py-2 font-medium text-gray-700 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/register"
                    className="px-5 py-2.5 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white font-semibold rounded-xl hover:shadow-lg transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                  >
                    S'inscrire gratuitement
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
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
              className="fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm md:hidden"
              onClick={closeDrawer}
            />

            {/* Drawer panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[9999] w-[80%] max-w-xs bg-white shadow-2xl md:hidden flex flex-col"
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <Logo variant="default" size="sm" />
                  <button
                    onClick={closeDrawer}
                    className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
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
                        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-amber-50 text-amber-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`
                      }
                    >
                      <FiHome className="w-5 h-5" />
                      Accueil
                    </NavLink>
                    <Link
                      to="/salons?businessType=SALON"
                      onClick={closeDrawer}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isSalonPage && !isBoutiquePage
                          ? 'bg-amber-50 text-amber-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <FiScissors className="w-5 h-5" />
                      Salons
                    </Link>
                    <Link
                      to="/salons?businessType=BOUTIQUE"
                      onClick={closeDrawer}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isBoutiquePage
                          ? 'bg-amber-50 text-amber-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <FiShoppingBag className="w-5 h-5" />
                      Boutiques
                    </Link>
                  </div>

                  {/* Divider */}
                  <div className="my-4 border-t border-gray-100" />

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
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>

                      <Link
                        to={user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? '/admin' : user.role === 'PRO' ? '/pro/dashboard' : '/dashboard'}
                        onClick={closeDrawer}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <FiCalendar className="w-5 h-5" />
                        <span>{user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? 'Dashboard admin' : user.role === 'PRO' ? 'Mon dashboard' : 'Mes réservations'}</span>
                      </Link>
                      <button
                        onClick={() => { closeDrawer(); navigate('/dashboard') }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full"
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
                      <Link
                        to="/profile"
                        onClick={closeDrawer}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
                        className="block py-2.5 px-4 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors border border-gray-200"
                      >
                        Connexion
                      </Link>
                      <Link
                        to="/register"
                        onClick={closeDrawer}
                        className="block py-2.5 px-4 text-center text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                      >
                        S'inscrire gratuitement
                      </Link>
                    </div>
                  )}
                </div>

                {/* Drawer footer - logout */}
                {isAuthenticated && (
                  <div className="border-t border-gray-100 px-4 py-4">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
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

