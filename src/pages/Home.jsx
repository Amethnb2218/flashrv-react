import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { FiSearch, FiMapPin, FiCalendar, FiStar, FiArrowRight, FiCheck, FiNavigation, FiShield, FiUsers, FiClock, FiZap, FiMessageSquare, FiAlertTriangle, FiX, FiShoppingBag } from 'react-icons/fi'
import { categories } from '../data/salons'
import SalonCard from '../components/Salon/SalonCard'
import toast from 'react-hot-toast'
import apiFetch from '@/api/client'

function Home() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const reduceMotion = useReducedMotion()
  const [feedbackModal, setFeedbackModal] = useState({ open: false, type: 'suggestion' })
  const [feedbackModalKey, setFeedbackModalKey] = useState(0)

  const [salons, setSalons] = useState([])
  const [salonsTotal, setSalonsTotal] = useState(0)
  const [loadingSalons, setLoadingSalons] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchSalons = async () => {
      try {
        setLoadingSalons(true)
        const res = await apiFetch('/salons?limit=100')
        const data = res?.data ?? res
        const list = data?.salons ?? res?.salons ?? []
        if (!mounted) return
        setSalons(list)
        setSalonsTotal(res?.total ?? data?.total ?? list.length)
      } catch (e) {
        if (!mounted) return
        setSalons([])
        setSalonsTotal(0)
      } finally {
        if (mounted) setLoadingSalons(false)
      }
    }
    fetchSalons()
    return () => {
      mounted = false
    }
  }, [])

  const onlySalons = useMemo(() => salons.filter(s => (s.businessType || 'SALON') !== 'BOUTIQUE'), [salons])
  const onlyBoutiques = useMemo(() => salons.filter(s => s.businessType === 'BOUTIQUE'), [salons])

  const featuredSalons = useMemo(() => {
    const list = [...onlySalons]
    list.sort((a, b) => {
      const da = a?.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b?.createdAt ? new Date(b.createdAt).getTime() : 0
      return da - db
    })
    return list.slice(0, 3)
  }, [onlySalons])

  const featuredBoutiques = useMemo(() => {
    const list = [...onlyBoutiques]
    list.sort((a, b) => {
      const da = a?.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b?.createdAt ? new Date(b.createdAt).getTime() : 0
      return da - db
    })
    return list.slice(0, 3)
  }, [onlyBoutiques])

  const getFeaturedGridClass = (count, loading) => {
    if (loading || count >= 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
    return 'grid-cols-1'
  }

  const featuredSalonGridClass = getFeaturedGridClass(featuredSalons.length, loadingSalons)
  const featuredBoutiqueGridClass = getFeaturedGridClass(featuredBoutiques.length, loadingSalons)
  const centerSalonsGrid = !loadingSalons && featuredSalons.length === 1
  const centerBoutiquesGrid = !loadingSalons && featuredBoutiques.length === 1

  const totalReviews = salons.reduce((sum, s) => sum + (s.reviewCount || 0), 0)
  const avgRating = salons.length
    ? (totalReviews > 0
      ? (salons.reduce((sum, s) => sum + (s.rating || 0), 0) / salons.length).toFixed(1)
      : 'Nouveau')
    : 'â€”'
  const stats = [
    { value: `${onlySalons.length}`, label: 'Salons partenaires', show: onlySalons.length > 0 },
    { value: `${onlyBoutiques.length}`, label: 'Boutiques', show: onlyBoutiques.length > 0 },
    { value: `${totalReviews}`, label: 'Avis clients', show: totalReviews > 0 },
    { value: avgRating, label: 'Note moyenne', show: avgRating !== 'Nouveau' && avgRating !== 'â€”' }
  ].filter(s => s.show)

  const steps = [
    {
      icon: <FiSearch className="w-6 h-6" />,
      title: 'Recherchez',
      description: 'Filtrez par quartier, sp\u00e9cialit\u00e9, avis ou disponibilit\u00e9. Comparez les prix et photos en un coup d\'\u0153il.',
      link: '/salons'
    },
    {
      icon: <FiCalendar className="w-6 h-6" />,
      title: 'R\u00e9servez',
      description: 'Choisissez vos services, votre coiffeur et un cr\u00e9neau libre. Confirmation instantan\u00e9e, z\u00e9ro appel t\u00e9l\u00e9phonique.',
      link: '/salons'
    },
    {
      icon: <FiStar className="w-6 h-6" />,
      title: 'Profitez',
      description: 'Rappel automatique avant le rendez-vous. Apr\u00e8s votre visite, notez le salon pour aider la communaut\u00e9.',
      link: '/salons'
    }
  ]

  const trustItems = [
    { icon: <FiShield className="w-5 h-5" />, title: 'Paiement sÃ©curisÃ©', desc: 'Transactions fiables et protÃ©gÃ©es.' },
    { icon: <FiUsers className="w-5 h-5" />, title: 'Salons vÃ©rifiÃ©s', desc: 'Professionnels contrÃ´lÃ©s et notÃ©s.' },
    { icon: <FiClock className="w-5 h-5" />, title: 'Gain de temps', desc: 'RÃ©servation rapide en quelques clics.' },
  ]

  const quickFilters = [
    { label: 'Aujourdâ€™hui', icon: <FiCalendar className="w-4 h-4" />, params: { day: 'today' } },
    { label: 'Dispo maintenant', icon: <FiClock className="w-4 h-4" />, params: { openNow: '1' } },
    { label: '< 2 km', icon: <FiNavigation className="w-4 h-4" />, params: { radius: '2' } },
    { label: 'Top notÃ©s', icon: <FiStar className="w-4 h-4" />, params: { sortBy: 'rating' } },
  ]

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return salons
      .filter((s) => (s.name || '').toLowerCase().includes(q))
      .slice(0, 5)
  }, [salons, searchQuery])

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(`/salons?search=${encodeURIComponent(searchQuery)}`)
  }

  const handleQuickFilter = (params) => {
    const qs = new URLSearchParams(params).toString()
    navigate(`/salons${qs ? `?${qs}` : ''}`)
  }

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      toast.error("La gÃ©olocalisation n'est pas supportÃ©e par votre navigateur")
      return
    }

    if (window.isSecureContext === false) {
      toast.error("La gÃ©olocalisation nÃ©cessite une connexion sÃ©curisÃ©e (HTTPS).", { duration: 5000 })
      return
    }

    setIsLocating(true)

    const onSuccess = (position) => {
      const { latitude, longitude } = position.coords
      toast.success('Position trouvÃ©e !')
      sessionStorage.setItem('flashrv_location', JSON.stringify({ lat: latitude, lng: longitude }))
      navigate(`/salons?lat=${latitude}&lng=${longitude}`)
      setIsLocating(false)
    }

    const onError = (error, isRetry = false) => {
      // If high-accuracy failed (not a permission issue), retry with low accuracy
      if (!isRetry && error.code !== 1) {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (retryErr) => onError(retryErr, true),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
        )
        return
      }

      setIsLocating(false)
      // Redirect to salons page anyway so the user isn't stuck
      toast('Position non disponible â€” affichage de tous les salons.', { id: 'geo-fallback', icon: 'ðŸ“', duration: 3000 })
      navigate('/salons')
    }

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => onError(err, false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  }

  const openFeedback = (type = 'suggestion') => {
    setFeedbackModal({ open: true, type })
    setFeedbackModalKey((k) => k + 1)
  }

  const closeFeedback = () => {
    setFeedbackModal((prev) => ({ ...prev, open: false }))
  }

  return (
    <div className="overflow-hidden bg-white dark:bg-[#15110d]">
      {/* Hero */}
      <section className="relative bg-mesh dark:bg-[linear-gradient(180deg,#1c1510_0%,#15100c_55%,#110d0a_100%)]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-12 right-12 w-72 h-72 bg-gold-100/30 dark:bg-gold-500/12 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-8 w-80 h-80 bg-gold-100/24 dark:bg-gold-500/10 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-6">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.6 }}
            >
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gold-100 text-primary-900 dark:bg-gold-500/12 dark:text-gold-300 border border-gold-100/70 dark:border-gold-500/30">
                Gratuit Â· Sans engagement
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#1f1b16] dark:text-[#f3e8d9] leading-tight">
                RÃ©servez votre{' '}
                <span className="text-[#7a6542] dark:text-gold-300">
                  salon de beautÃ©
                </span>{' '}
                en 30 secondes
              </h1>
              <p className="mt-2 text-base md:text-lg text-[#5f574d] dark:text-[#cfbca4] max-w-xl leading-relaxed">
                Trouvez un salon vÃ©rifiÃ© prÃ¨s de chez vous, comparez les services et tarifs, et rÃ©servez en ligne â€” sans appel ni attente.
              </p>

              <form onSubmit={handleSearch} className="mt-4 bg-white/95 dark:bg-[#1d1712] rounded-xl p-2.5 shadow-[0_28px_70px_-40px_rgba(62,46,31,0.45)] dark:shadow-[0_28px_70px_-40px_rgba(0,0,0,0.65)] border border-white/70 dark:border-[#46382a] backdrop-blur">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-500 w-5 h-5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                      aria-label="Rechercher un salon"
                      aria-autocomplete="list"
                      aria-expanded={showSuggestions && suggestions.length > 0}
                      aria-controls="home-suggestions"
                      placeholder="Quartier, ville, salon..."
                      className="w-full pl-12 pr-4 py-3 md:py-4 bg-white dark:bg-[#251d16] dark:text-[#f3e8d9] dark:placeholder-[#9e886f] rounded-xl focus:ring-2 focus:ring-gold-400 focus:bg-white dark:focus:bg-[#31261d] transition-all outline-none text-primary-800 placeholder-primary-400"
                    />
                    <AnimatePresence>
                      {showSuggestions && suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: reduceMotion ? 0 : 0.2 }}
                          className="absolute z-20 mt-2 w-full rounded-2xl border border-primary-100 dark:border-[#46382a] bg-white dark:bg-[#1d1712] shadow-2xl p-2"
                          role="listbox"
                          id="home-suggestions"
                        >
                          {suggestions.map((salon) => (
                            <button
                              key={salon.id}
                              type="button"
                              onMouseDown={() => navigate(`/salon/${salon.id}`)}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-gold-50 dark:hover:bg-[#292018] transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-primary-900 dark:text-[#f3e8d9]">{salon.name}</p>
                                  <p className="text-xs text-primary-500 dark:text-[#ab967c]">{salon.city || salon.address}</p>
                                </div>
                                <span className="text-xs font-semibold text-primary-600">
                                  {salon.reviewCount ? `${Number(salon.rating || 0).toFixed(1)}?` : 'Nouveau'}
                                </span>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 bg-primary-900 hover:bg-primary-800 dark:bg-gold-500 dark:hover:bg-gold-400 text-white dark:text-primary-900 font-semibold py-3 px-6 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1d1712]"
                  >
                    <FiSearch className="w-5 h-5" />
                    <span>Rechercher</span>
                    <FiArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleGeolocation}
                    disabled={isLocating}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-[#251d16] hover:bg-primary-100 dark:hover:bg-[#31261d] text-primary-700 dark:text-[#e5d6c2] rounded-full text-sm transition-all disabled:opacity-50"
                  >
                    {isLocating ? (
                      <div className="w-3.5 h-3.5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiNavigation className="w-3.5 h-3.5 text-gold-600" />
                    )}
                    <span>{isLocating ? 'Localisation...' : 'Ma position'}</span>
                  </button>
                    {quickFilters.slice(0, 2).map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleQuickFilter(chip.params)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium bg-white dark:bg-[#251d16] text-primary-600 dark:text-[#cfbca4] border border-primary-200 dark:border-[#46382a] hover:border-primary-300 dark:hover:border-gold-400/40 hover:text-primary-900 dark:hover:text-gold-300 hover:bg-[#f3eee3] dark:hover:bg-gold-500/10 transition-all"
                      >
                        <span className="text-gold-500">{chip.icon}</span>
                        {chip.label}
                      </button>
                    ))}
                </div>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.2 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800"
                  alt="Salon premium"
                  className="rounded-2xl shadow-2xl w-full object-cover aspect-[4/3]"
                />
                <div className="absolute -bottom-3 -left-3 bg-white dark:bg-[#1d1712] rounded-xl shadow-lg p-3 border border-primary-100 dark:border-[#46382a]">
                  <div className="flex items-center gap-1.5">
                    <FiStar className="w-4 h-4 text-gold-400 fill-current" />
                    <span className="font-semibold text-primary-900 dark:text-[#f3e8d9] text-sm">4.9</span>
                    <span className="text-xs text-primary-500 dark:text-[#ab967c]">+{totalReviews} avis</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Salons */}
      <section className="py-6 bg-white dark:bg-[#19140f] dark:border-y dark:border-[#382c22]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-primary-900 dark:text-[#f3e8d9]">
                Salons en vedette
              </h2>
              <p className="text-sm text-primary-500 dark:text-[#ab967c] mt-0.5">Les meilleurs salons pour dÃ©marrer votre expÃ©rience.</p>
            </div>
            <Link
              to="/salons"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-900 dark:text-gold-300 hover:text-primary-950 dark:hover:text-gold-200 transition-colors group"
            >
              <span>Voir tout</span>
              <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className={`grid ${featuredSalonGridClass} gap-3 ${centerSalonsGrid ? 'mx-auto max-w-md' : ''}`}>
            {loadingSalons ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-[#1d1712] rounded-xl border border-primary-100 dark:border-[#46382a] p-3 animate-pulse">
                  <div className="h-32 bg-primary-100 dark:bg-[#251d16] rounded-lg mb-3"></div>
                  <div className="h-3 bg-primary-100 dark:bg-[#251d16] rounded w-2/3 mb-2"></div>
                  <div className="h-2.5 bg-primary-100 dark:bg-[#251d16] rounded w-1/2"></div>
                </div>
              ))
            ) : (
              featuredSalons.map((salon, i) => (
                <SalonCard key={salon.id} salon={salon} index={i} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Featured Boutiques */}
      {(loadingSalons || featuredBoutiques.length > 0) && (
      <section className="py-6 bg-white dark:bg-[#16120e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-primary-900 dark:text-[#f3e8d9]">
                <FiShoppingBag className="mr-1.5 inline-block text-gold-500" /> Boutiques
              </h2>
              <p className="text-sm text-primary-500 dark:text-[#ab967c] mt-0.5">Commandez en ligne auprÃ¨s de nos partenaires.</p>
            </div>
            <Link
              to="/salons?businessType=BOUTIQUE"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-900 dark:text-gold-300 hover:text-primary-950 dark:hover:text-gold-200 transition-colors group"
            >
              <span>Voir tout</span>
              <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className={`grid ${featuredBoutiqueGridClass} gap-3 ${centerBoutiquesGrid ? 'mx-auto max-w-md' : ''}`}>
            {loadingSalons ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-[#1d1712] rounded-xl border border-primary-100 dark:border-[#46382a] p-3 animate-pulse">
                  <div className="h-32 bg-primary-100 dark:bg-[#251d16] rounded-lg mb-3"></div>
                  <div className="h-3 bg-primary-100 dark:bg-[#251d16] rounded w-2/3 mb-2"></div>
                  <div className="h-2.5 bg-primary-100 dark:bg-[#251d16] rounded w-1/2"></div>
                </div>
              ))
            ) : (
              featuredBoutiques.map((salon, i) => (
                <SalonCard key={salon.id} salon={salon} index={i} />
              ))
            )}
          </div>
        </div>
      </section>
      )}

      {/* Categories */}
      <section className="py-6 bg-gradient-to-b from-white dark:from-[#16120e] to-gold-50/10 dark:to-[#1b1510]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-primary-900 dark:text-[#f3e8d9]">CatÃ©gories</h2>
              <p className="text-sm text-primary-500 dark:text-[#ab967c] mt-0.5">Trouvez votre service en un clic.</p>
            </div>
            <Link
              to="/salons"
              className="text-sm font-semibold text-primary-900 dark:text-gold-300 hover:text-primary-950 dark:hover:text-gold-200 inline-flex items-center gap-1.5 group"
            >
              Voir tout
              <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {categories.slice(0, 3).map((cat, idx) => (
              <Link
                key={cat.id}
                to={`/salons?category=${cat.id}`}
                className="group flex flex-col items-center gap-1 rounded-lg bg-white dark:bg-[#1d1712] p-2.5 border border-primary-100 dark:border-[#46382a] shadow-sm hover:border-gold-200 hover:bg-gold-50 dark:hover:bg-[#292018] transition-all"
              >
                {cat.icon && (
                  <span className="text-xl">{cat.icon}</span>
                )}
                <span className="text-xs sm:text-sm font-medium text-primary-700 dark:text-[#cfbca4] group-hover:text-primary-900 dark:group-hover:text-gold-300 text-center leading-tight">
                  {cat.name}
                </span>
              </Link>
            ))}
            <Link
              to="/salons"
              className="group flex flex-col items-center justify-center gap-1 rounded-lg bg-gold-50 dark:bg-gold-500/10 p-2.5 border border-gold-100 dark:border-gold-500/30 hover:bg-gold-100 dark:hover:bg-gold-500/20 transition-all"
            >
              <span className="text-sm text-primary-800 dark:text-gold-300">+{categories.length - 3}</span>
              <span className="text-xs sm:text-sm font-medium text-primary-900 dark:text-gold-300 text-center">Voir plus</span>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-6 bg-white dark:bg-[#19140f] dark:border-y dark:border-[#382c22]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg md:text-xl font-bold text-primary-900 dark:text-[#f3e8d9] mb-3 text-center">
            Comment Ã§a marche ?
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {steps.map((step, i) => (
              <Link
                key={i}
                to={step.link}
                className="relative bg-white dark:bg-[#1d1712] border border-primary-100 dark:border-[#46382a] rounded-xl p-2.5 md:p-5 text-center shadow-sm hover:border-gold-200 dark:hover:border-gold-400/40 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="w-8 h-8 md:w-11 md:h-11 bg-primary-900 text-white rounded-lg flex items-center justify-center mx-auto mb-1.5 md:mb-3">
                  {step.icon}
                </div>
                <h3 className="text-[11px] sm:text-sm md:text-base font-bold text-primary-900 dark:text-[#f3e8d9] mb-0.5 md:mb-1">{step.title}</h3>
                <p className="text-[10px] md:text-sm text-primary-500 dark:text-[#ab967c] leading-snug hidden sm:block">{step.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-8 border-y border-primary-300/70 dark:border-[#382c22] bg-gradient-to-br from-[#f4efe5] via-[#ece4d7] to-[#e4d9c8] dark:from-[#19140f] dark:via-[#17120e] dark:to-[#120e0b]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-primary-300/80 dark:border-[#46382a] bg-[#f7f1e7] dark:bg-[#1d1712] shadow-card backdrop-blur-sm text-center px-5 py-6 md:px-8 md:py-7">
            <h2 className="text-xl md:text-2xl font-bold text-primary-900 dark:text-[#f3e8d9] mb-1.5">
            Vous Ãªtes professionnel ?
            </h2>
            <p className="text-sm md:text-base text-primary-600 dark:text-[#cfbca4] mb-3">
            Inscription gratuite Â· Sans commission Â· ContrÃ´le total
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-4 text-sm text-primary-700 dark:text-[#cfbca4]">
            {[
              'Profil vÃ©rifiÃ©',
              'RÃ©servation 24/7',
              'Rappels auto',
              'Dashboard & stats',
            ].map((b) => (
              <div key={b} className="flex items-center gap-1.5">
                <FiCheck className="w-3.5 h-3.5 text-gold-600 dark:text-gold-300 flex-shrink-0" />
                <span>{b}</span>
              </div>
            ))}
            </div>
            <Link
              to="/register?role=pro"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-600 hover:to-gold-500 text-primary-900 font-bold py-2.5 px-5 rounded-full text-sm transition-all hover:shadow-lg shadow-gold-500/20"
            >
              <span>Devenir partenaire</span>
              <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feedback */}
      <section className="py-6 bg-[#fdf9f2] dark:bg-[#18130f]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#fbf5ea] dark:bg-[#201812] rounded-xl border border-primary-200 dark:border-[#46382a] shadow-sm p-4 text-center">
            <h3 className="text-base md:text-lg font-bold text-primary-900 dark:text-[#f3e8d9] mb-0.5">Votre avis compte</h3>
            <p className="text-sm text-primary-500 dark:text-[#ab967c] mb-2">
              Bug, suggestion, amÃ©lioration â€” nous lisons tout.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => openFeedback('suggestion')}
                className="btn-primary text-sm py-2 px-4"
              >
                Suggestion
              </button>
              <button
                type="button"
                onClick={() => openFeedback('bug')}
                className="btn-secondary text-sm py-2 px-4"
              >
                Bug
              </button>
            </div>
          </div>
        </div>
      </section>

      {createPortal(
        <AnimatePresence>
          {feedbackModal.open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
              onClick={closeFeedback}
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.25 }}
                className="w-full max-w-3xl my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <FeedbackWidget
                  key={feedbackModalKey}
                  defaultType={feedbackModal.type}
                  onClose={closeFeedback}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

function FeedbackWidget({ onClose, defaultType = 'suggestion' }) {
  const [feedbackType, setFeedbackType] = useState(defaultType)
  const [form, setForm] = useState({
    page: '',
    steps: '',
    expected: '',
    actual: '',
    idea: '',
    benefit: '',
    problem: '',
    impact: 'gÃªnant',
    contact: ''
  })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setFeedbackType(defaultType)
  }, [defaultType])

  const types = [
    { id: 'bug', label: 'Bug', icon: <FiAlertTriangle className="w-4 h-4" />, hint: 'Signalez un dysfonctionnement prÃ©cis.' },
    { id: 'suggestion', label: 'Suggestion', icon: <FiMessageSquare className="w-4 h-4" />, hint: 'Proposez une amÃ©lioration utile.' },
    { id: 'problem', label: 'ProblÃ¨me', icon: <FiZap className="w-4 h-4" />, hint: 'Indiquez un point bloquant ou frustrant.' }
  ]

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const validate = () => {
    const requiredByType = {
      bug: ['page', 'steps', 'expected', 'actual'],
      suggestion: ['idea'],
      problem: ['problem', 'impact']
    }
    const nextErrors = {}
    requiredByType[feedbackType].forEach((field) => {
      if (!String(form[field] || '').trim()) {
        nextErrors[field] = 'Ce champ est requis.'
      }
    })
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Merci de complÃ©ter les champs requis.')
      return
    }
    const feedbackData = {
      type: feedbackType,
      payload: form,
      contact: form.contact || '',
      timestamp: new Date().toISOString()
    }
    try {
      setIsSubmitting(true)
      await apiFetch('/feedback', { method: 'POST', body: { type: feedbackType, payload: form, contact: form.contact } })
      setSubmitted(true)
    } catch (err) {
      const existingFeedback = JSON.parse(sessionStorage.getItem('flashrv_feedback') || '[]')
      sessionStorage.setItem('flashrv_feedback', JSON.stringify([...existingFeedback, feedbackData]))
      toast.error("Erreur lors de lâ€™envoi. Nous avons gardÃ© une copie locale.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#201812] rounded-3xl shadow-lg p-8 text-center border border-primary-100 dark:border-[#46382a]"
      >
        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiCheck className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-primary-800 mb-2">EnvoyÃ©</h3>
        <p className="text-primary-600 mb-6">
          Merci ! Votre retour nous aide Ã  amÃ©liorer Jolof’Era pour tous.
        </p>
        <button
          onClick={() => {
            setSubmitted(false)
            setForm({
              page: '',
              steps: '',
              expected: '',
              actual: '',
              idea: '',
              benefit: '',
              problem: '',
              impact: 'gÃªnant',
              contact: ''
            })
            setErrors({})
          }}
          className="text-primary-800 font-medium hover:text-primary-900 transition-colors"
        >
          Envoyer un autre message
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white dark:bg-[#201812] rounded-3xl shadow-lg overflow-hidden border border-primary-100 dark:border-[#46382a] relative"
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full border border-primary-200 flex items-center justify-center hover:bg-primary-50"
          aria-label="Fermer le formulaire"
        >
          <FiX className="w-5 h-5 text-primary-600" />
        </button>
      )}
      <div className="grid sm:grid-cols-3 border-b border-primary-100">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => setFeedbackType(type.id)}
            className={`flex items-center justify-center gap-2 py-4 px-4 text-sm font-medium transition-all ${
              feedbackType === type.id
                ? 'bg-gold-50 text-primary-900 border-b-2 border-gold-500'
                : 'text-primary-500 hover:bg-primary-50'
            }`}
          >
            <span className="text-gold-500">{type.icon}</span>
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-sm text-primary-600">
            {types.find((t) => t.id === feedbackType)?.hint}
          </p>
        </div>

        {feedbackType === 'bug' && (
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Page concernÃ©e</label>
              <input
                value={form.page}
                onChange={(e) => updateField('page', e.target.value)}
                className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="/salon/..."
              />
              {errors.page && <p className="text-xs text-red-600 mt-1">{errors.page}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Ã‰tapes pour reproduire</label>
              <input
                value={form.steps}
                onChange={(e) => updateField('steps', e.target.value)}
                className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="Ex. ouvrir, cliquer, ..."
              />
              {errors.steps && <p className="text-xs text-red-600 mt-1">{errors.steps}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">RÃ©sultat attendu</label>
              <textarea
                value={form.expected}
                onChange={(e) => updateField('expected', e.target.value)}
                rows={3}
                className="w-full resize-none px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="Ce que vous vouliez voir"
              />
              {errors.expected && <p className="text-xs text-red-600 mt-1">{errors.expected}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">RÃ©sultat obtenu</label>
              <textarea
                value={form.actual}
                onChange={(e) => updateField('actual', e.target.value)}
                rows={3}
                className="w-full resize-none px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="Ce qui s'est rÃ©ellement passÃ©"
              />
              {errors.actual && <p className="text-xs text-red-600 mt-1">{errors.actual}</p>}
            </div>
          </div>
        )}

        {feedbackType === 'suggestion' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Votre idÃ©e</label>
              <textarea
                value={form.idea}
                onChange={(e) => updateField('idea', e.target.value)}
                rows={4}
                className="w-full resize-none px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="DÃ©crivez l'amÃ©lioration que vous aimeriez"
              />
              {errors.idea && <p className="text-xs text-red-600 mt-1">{errors.idea}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">BÃ©nÃ©fice attendu</label>
              <textarea
                value={form.benefit}
                onChange={(e) => updateField('benefit', e.target.value)}
                rows={3}
                className="w-full resize-none px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="Pourquoi est-ce utile pour vous ?"
              />
            </div>
          </div>
        )}

        {feedbackType === 'problem' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Quel problÃ¨me rencontrez-vous ?</label>
              <textarea
                value={form.problem}
                onChange={(e) => updateField('problem', e.target.value)}
                rows={4}
                className="w-full resize-none px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="DÃ©crivez ce qui vous bloque"
              />
              {errors.problem && <p className="text-xs text-red-600 mt-1">{errors.problem}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Impact</label>
              <select
                value={form.impact}
                onChange={(e) => updateField('impact', e.target.value)}
                className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              >
                <option value="bloquant">Bloquant</option>
                <option value="gÃªnant">GÃªnant</option>
                <option value="mineur">Mineur</option>
              </select>
              {errors.impact && <p className="text-xs text-red-600 mt-1">{errors.impact}</p>}
            </div>
          </div>
        )}

        <div className="mt-6">
          <label className="block text-sm font-medium text-primary-700 mb-2">Contact (optionnel)</label>
          <input
            value={form.contact}
            onChange={(e) => updateField('contact', e.target.value)}
            className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-transparent"
            placeholder="email@exemple.com"
          />
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-primary-400">
            Nous rÃ©pondons aux problÃ¨mes critiques sous 48h ouvrÃ©es.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary-900 hover:bg-primary-800 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Envoiâ€¦' : 'Envoyer'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

export default Home

