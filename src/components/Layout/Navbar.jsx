import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FiMenu, FiX, FiUser, FiLogOut, FiCalendar, FiSettings, FiPhone, FiMapPin, FiSearch, FiHeart, FiStar } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '../UI/Logo'

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

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
    navigate('/')
  }

  const navLinks = [
    { to: '/', label: 'Accueil' },
    { to: '/salons', label: 'Salons' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Top bar avec infos utiles */}
      <div className="bg-gray-900 text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-8">
            <div className="hidden sm:flex items-center space-x-6">
              <a href="tel:+221338001234" className="flex items-center space-x-1.5 hover:text-amber-400 transition-colors">
                <FiPhone className="w-3 h-3" />
                <span>+221 33 800 12 34</span>
              </a>
              <span className="flex items-center space-x-1.5">
                <FiMapPin className="w-3 h-3 text-amber-400" />
                <span>Dakar, Sénégal</span>
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="hidden sm:flex items-center space-x-1 text-amber-400">
                <FiStar className="w-3 h-3 fill-current" />
                <span className="text-white">4.8/5 - Plus de 500 avis</span>
              </span>
              <span className="flex items-center space-x-1.5 bg-amber-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-amber-400 font-medium">Réservation 24h/24</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main navbar */}
      <div className={`transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg' 
          : 'bg-white shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo FlashRV' */}
            <Logo variant="default" size="md" />

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `
                    px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                    ${isActive 
                      ? 'text-gray-900 bg-gray-100' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  {link.label}
                </NavLink>
              ))}
              
              <button 
                onClick={() => navigate('/salons')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
              >
                <FiSearch className="w-4 h-4" />
                <span className="text-sm">Rechercher</span>
              </button>
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center space-x-2">
              <button 
                onClick={() => isAuthenticated ? navigate('/dashboard') : navigate('/login')}
                className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Mes favoris"
              >
                <FiHeart className="w-5 h-5" />
              </button>
              
              <div className="h-6 w-px bg-gray-200"></div>
              
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-all focus:outline-none"
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
                          to={user.role === 'coiffeur' ? '/coiffeur/dashboard' : '/dashboard'}
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        >
                          <FiCalendar className="w-4 h-4" />
                          <span>Mes réservations</span>
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
                    className="px-4 py-2 font-medium text-gray-700 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/register"
                    className="px-5 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
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
            >
              {isOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white rounded-b-2xl shadow-lg overflow-hidden border-t border-gray-100"
            >
              <div className="px-4 py-4 space-y-2">
                {navLinks.map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => `
                      block py-3 px-4 rounded-xl font-medium transition-colors
                      ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}
                    `}
                  >
                    {link.label}
                  </NavLink>
                ))}
                
                <div className="border-t border-gray-100 pt-4 mt-4">
                  {isAuthenticated ? (
                    <>
                      <div className="flex items-center space-x-3 px-4 py-2">
                        {(user.avatar || user.picture) ? (
                          <img
                            src={user.avatar || user.picture}
                            alt={user.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-lg">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <Link
                        to={user.role === 'coiffeur' ? '/coiffeur/dashboard' : '/dashboard'}
                        onClick={() => setIsOpen(false)}
                        className="block py-2 px-4 text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        Mes réservations
                      </Link>
                      <button
                        onClick={() => { handleLogout(); setIsOpen(false) }}
                        className="block w-full text-left py-2 px-4 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Déconnexion
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Link
                        to="/login"
                        onClick={() => setIsOpen(false)}
                        className="block py-2 px-4 text-center text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                      >
                        Connexion
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setIsOpen(false)}
                        className="block py-2 px-4 text-center bg-gray-900 text-white rounded-lg font-medium"
                      >
                        Inscription
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

export default Navbar

