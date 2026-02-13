import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { FiSearch, FiMapPin, FiCalendar, FiStar, FiArrowRight, FiCheck, FiNavigation, FiShield, FiUsers, FiClock, FiZap, FiMessageSquare, FiAlertTriangle, FiX } from 'react-icons/fi'
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

  const featuredSalons = useMemo(() => {
    const list = [...salons]
    list.sort((a, b) => {
      const da = a?.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b?.createdAt ? new Date(b.createdAt).getTime() : 0
      return da - db
    })
    return list.slice(0, 3)
  }, [salons])

  const totalReviews = salons.reduce((sum, s) => sum + (s.reviewCount || 0), 0)
  const avgRating = salons.length
    ? (totalReviews > 0
      ? (salons.reduce((sum, s) => sum + (s.rating || 0), 0) / salons.length).toFixed(1)
      : 'Nouveau')
    : '—'
  const stats = [
    { value: `${salonsTotal || salons.length}`, label: 'Salons partenaires' },
    { value: `${totalReviews}`, label: 'Avis clients' },
    { value: avgRating, label: 'Note moyenne' }
  ]

  const steps = [
    {
      icon: <FiSearch className="w-6 h-6" />,
      title: 'Recherchez',
      description: 'Trouvez le salon idéal près de chez vous, selon vos critères.'
    },
    {
      icon: <FiCalendar className="w-6 h-6" />,
      title: 'Réservez',
      description: "Choisissez vos services, la date et l'heure qui vous conviennent."
    },
    {
      icon: <FiStar className="w-6 h-6" />,
      title: 'Profitez',
      description: "Rendez-vous au salon et profitez d'une expérience premium."
    }
  ]

  const trustItems = [
    { icon: <FiShield className="w-5 h-5" />, title: 'Paiement sécurisé', desc: 'Transactions fiables et protégées.' },
    { icon: <FiUsers className="w-5 h-5" />, title: 'Salons vérifiés', desc: 'Professionnels contrôlés et notés.' },
    { icon: <FiClock className="w-5 h-5" />, title: 'Gain de temps', desc: 'Réservation rapide en quelques clics.' },
  ]

  const quickFilters = [
    { label: 'Aujourd’hui', icon: <FiCalendar className="w-4 h-4" />, params: { day: 'today' } },
    { label: 'Dispo maintenant', icon: <FiClock className="w-4 h-4" />, params: { openNow: '1' } },
    { label: '< 2 km', icon: <FiNavigation className="w-4 h-4" />, params: { radius: '2' } },
    { label: 'Top notés', icon: <FiStar className="w-4 h-4" />, params: { sortBy: 'rating' } },
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
      toast.error("La géolocalisation n'est pas supportée par votre navigateur")
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        toast.success('Position trouvée !')
        localStorage.setItem('flashrv_location', JSON.stringify({ lat: latitude, lng: longitude }))
        navigate(`/salons?lat=${latitude}&lng=${longitude}`)
        setIsLocating(false)
      },
      (error) => {
        setIsLocating(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Vous avez refusé la géolocalisation')
            break
          case error.POSITION_UNAVAILABLE:
            toast.error('Position non disponible')
            break
          default:
            toast.error('Erreur de géolocalisation')
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="overflow-hidden bg-white">
      {/* Hero */}
      <section className="relative bg-mesh">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-12 right-12 w-72 h-72 bg-amber-100/50 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-8 w-80 h-80 bg-yellow-100/40 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.6 }}
            >
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                Réservation simple, résultat premium
              </span>
              <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Le meilleur de la coiffure,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-600">
                  en quelques clics
                </span>
              </h1>
              <p className="mt-5 text-lg text-gray-600 max-w-xl leading-relaxed">
                StyleFlow connecte clients et professionnels. Comparez, réservez et gérez vos rendez-vous facilement.
              </p>

              <form onSubmit={handleSearch} className="mt-8 bg-white/95 rounded-3xl p-4 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.6)] border border-white/70 backdrop-blur">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 w-5 h-5" />
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
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all outline-none text-gray-800 placeholder-gray-400"
                    />
                    <AnimatePresence>
                      {showSuggestions && suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: reduceMotion ? 0 : 0.2 }}
                          className="absolute z-20 mt-2 w-full rounded-2xl border border-gray-100 bg-white shadow-2xl p-2"
                          role="listbox"
                          id="home-suggestions"
                        >
                          {suggestions.map((salon) => (
                            <button
                              key={salon.id}
                              type="button"
                              onMouseDown={() => navigate(`/salon/${salon.id}`)}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{salon.name}</p>
                                  <p className="text-xs text-gray-500">{salon.city || salon.address}</p>
                                </div>
                                <span className="text-xs font-semibold text-gray-600">
                                  {salon.reviewCount ? `${Number(salon.rating || 0).toFixed(1)}★` : 'Nouveau'}
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
                    className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-4 px-8 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                  >
                    <FiSearch className="w-5 h-5" />
                    <span>Rechercher</span>
                    <FiArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleGeolocation}
                    disabled={isLocating}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-all disabled:opacity-50"
                  >
                    {isLocating ? (
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiNavigation className="w-4 h-4 text-amber-600" />
                    )}
                    <span>{isLocating ? 'Localisation...' : 'Utiliser ma position'}</span>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {quickFilters.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleQuickFilter(chip.params)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:border-amber-200 hover:text-amber-700 hover:bg-amber-50 transition-all"
                      >
                        <span className="text-amber-500">{chip.icon}</span>
                        {chip.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.slice(0, 4).map(cat => (
                      <Link
                        key={cat.id}
                        to={`/salons?category=${cat.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-gray-600 rounded-full text-sm hover:bg-amber-50 hover:text-amber-700 transition-all border border-gray-200 hover:border-amber-200"
                      >
                        <span>{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </form>

                <div className="mt-10 grid grid-cols-3 gap-4 max-w-xl">
                  {stats.map((stat, i) => (
                    <div key={i} className="bg-white/80 border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                {[
                  { icon: <FiShield className="w-4 h-4" />, label: 'Paiement sécurisé' },
                  { icon: <FiCheck className="w-4 h-4" />, label: 'Salons vérifiés' },
                  { icon: <FiStar className="w-4 h-4" />, label: 'Avis clients authentiques' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-gray-100 px-3 py-1.5 shadow-sm"
                  >
                    <span className="text-amber-500">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.2 }}
              className="hidden lg:block lg:-mt-2"
            >
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800"
                  alt="Salon premium"
                  className="rounded-3xl shadow-2xl w-full object-cover aspect-[4/3]"
                />
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <FiStar className="w-5 h-5 text-amber-400 fill-current" />
                    <span className="font-semibold text-gray-900">4.9</span>
                    <span className="text-xs text-gray-500">+{totalReviews} avis</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Salons plébiscités par la communauté</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {trustItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : i * 0.08 }}
                className="bg-white/80 border border-gray-100 rounded-2xl p-5 shadow-sm"
              >
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3">
                  {item.icon}
                </div>
                <p className="font-semibold text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Salons */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
            <div>
              <span className="inline-block px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4">
                Sélection premium
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Salons en vedette
              </h2>
              <p className="mt-2 text-gray-600">Les meilleurs salons pour démarrer votre expérience.</p>
            </div>
            <Link
              to="/salons"
              className="mt-6 md:mt-0 inline-flex items-center gap-2 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white font-semibold py-3 px-6 rounded-full transition-all shadow-lg hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 group"
            >
              <span>Voir tous les salons</span>
              <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loadingSalons ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                  <div className="h-40 bg-gray-100 rounded-xl mb-4"></div>
                  <div className="h-4 bg-gray-100 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
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

      {/* Categories */}
      <section className="py-16 bg-gradient-to-b from-white to-amber-50/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                Services populaires
              </span>
              <h2 className="mt-3 text-2xl md:text-3xl font-bold text-gray-900">Explorez par catégorie</h2>
              <p className="text-gray-600 mt-1">Choisissez votre service en un clic.</p>
            </div>
            <motion.button
              type="button"
              onClick={() => setShowAllCategories((prev) => !prev)}
              whileHover={reduceMotion ? {} : { scale: 1.06 }}
              whileTap={reduceMotion ? {} : { scale: 0.97 }}
              className="text-sm font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-2"
              aria-expanded={showAllCategories}
            >
              {showAllCategories ? 'Voir moins' : 'Voir tout'}
              <FiArrowRight className={`transition-transform ${showAllCategories ? 'rotate-180' : ''}`} />
            </motion.button>
          </div>
          <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <AnimatePresence>
              {(showAllCategories ? categories : categories.slice(0, 4)).map((cat, idx) => (
                <motion.div
                  key={cat.id}
                  layout
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 18, scale: 0.98 }}
                  transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : idx * 0.03 }}
                >
                  <Link
                    to={`/salons?category=${cat.id}`}
                    className="group relative block rounded-2xl bg-white/90 p-6 border border-amber-100/60 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] hover:-translate-y-1 hover:shadow-[0_28px_60px_-35px_rgba(15,23,42,0.6)] transition-all"
                  >
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-50/60 via-white to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="h-1.5 w-12 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-300 rounded-full" />
                      {cat.icon && (
                        <div className="mt-3 text-2xl text-amber-500">
                          {cat.icon}
                        </div>
                      )}
                      <div className="mt-4 font-semibold text-gray-900 group-hover:text-amber-700">
                        {cat.name}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Découvrir</div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4">
              Simple & Rapide
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Comment ça marche ?
            </h2>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute top-10 left-1/2 -translate-x-1/2 w-[70%] h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: reduceMotion ? 0 : i * 0.15 }}
                  className="relative bg-white/90 border border-gray-100 rounded-2xl p-6 text-center shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all"
                >
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gray-900 text-white text-xs font-semibold px-3 py-1 shadow">
                    0{i + 1}
                  </span>
                  <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                    {step.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-2 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium mb-6">
              Pour les professionnels
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Vous êtes professionnel de la beauté ?
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed">
              Rejoignez StyleFlow et développez votre activité. Plus de visibilité, gestion simple, clients fidélisés.
            </p>
            <Link
              to="/register?role=pro"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold py-4 px-8 rounded-full transition-all hover:shadow-lg"
            >
              <span>Devenir partenaire</span>
              <FiArrowRight />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Feedback */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <span className="inline-block px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4">
              Votre avis compte
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Aidez-nous à améliorer
            </h2>
          </motion.div>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-8 text-center">
            <p className="text-gray-600">
              Partagez un bug, une suggestion ou une amélioration. Nous lisons chaque retour.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => openFeedback('suggestion')}
                className="btn-primary"
              >
                Proposer une amélioration
              </button>
              <button
                type="button"
                onClick={() => openFeedback('bug')}
                className="btn-secondary"
              >
                Signaler un bug
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-4">Réponse sous 24–48h ouvrées.</p>
          </div>

          <AnimatePresence>
            {feedbackModal.open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={closeFeedback}
              >
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.25 }}
                  className="w-full max-w-3xl"
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
          </AnimatePresence>
        </div>
      </section>
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
    impact: 'gênant',
    contact: ''
  })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setFeedbackType(defaultType)
  }, [defaultType])

  const types = [
    { id: 'bug', label: 'Bug', icon: <FiAlertTriangle className="w-4 h-4" />, hint: 'Signalez un dysfonctionnement précis.' },
    { id: 'suggestion', label: 'Suggestion', icon: <FiMessageSquare className="w-4 h-4" />, hint: 'Proposez une amélioration utile.' },
    { id: 'problem', label: 'Problème', icon: <FiZap className="w-4 h-4" />, hint: 'Indiquez un point bloquant ou frustrant.' }
  ]

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const openFeedback = (type = 'suggestion') => {
    setFeedbackModal({ open: true, type })
    setFeedbackModalKey((k) => k + 1)
  }

  const closeFeedback = () => {
    setFeedbackModal((prev) => ({ ...prev, open: false }))
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
      toast.error('Merci de compléter les champs requis.')
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
      const existingFeedback = JSON.parse(localStorage.getItem('flashrv_feedback') || '[]')
      localStorage.setItem('flashrv_feedback', JSON.stringify([...existingFeedback, feedbackData]))
      toast.error("Erreur lors de l’envoi. Nous avons gardé une copie locale.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-lg p-8 text-center border border-gray-100"
      >
        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiCheck className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Envoyé</h3>
        <p className="text-gray-600 mb-6">
          Merci ! Votre retour nous aide à améliorer StyleFlow pour tous.
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
              impact: 'gênant',
              contact: ''
            })
            setErrors({})
          }}
          className="text-amber-600 font-medium hover:text-amber-700 transition-colors"
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
      className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100 relative"
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"
          aria-label="Fermer le formulaire"
        >
          <FiX className="w-5 h-5 text-gray-600" />
        </button>
      )}
      <div className="grid sm:grid-cols-3 border-b border-gray-100">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => setFeedbackType(type.id)}
            className={`flex items-center justify-center gap-2 py-4 px-4 text-sm font-medium transition-all ${
              feedbackType === type.id
                ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="text-amber-500">{type.icon}</span>
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            {types.find((t) => t.id === feedbackType)?.hint}
          </p>
        </div>

        {feedbackType === 'bug' && (
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Page concernée</label>
              <input
                value={form.page}
                onChange={(e) => updateField('page', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="/salon/..."
              />
              {errors.page && <p className="text-xs text-red-600 mt-1">{errors.page}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Étapes pour reproduire</label>
              <input
                value={form.steps}
                onChange={(e) => updateField('steps', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Ex. ouvrir, cliquer, ..."
              />
              {errors.steps && <p className="text-xs text-red-600 mt-1">{errors.steps}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Résultat attendu</label>
              <textarea
                value={form.expected}
                onChange={(e) => updateField('expected', e.target.value)}
                rows={3}
                className="w-full resize-none px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Ce que vous vouliez voir"
              />
              {errors.expected && <p className="text-xs text-red-600 mt-1">{errors.expected}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Résultat obtenu</label>
              <textarea
                value={form.actual}
                onChange={(e) => updateField('actual', e.target.value)}
                rows={3}
                className="w-full resize-none px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Ce qui s'est réellement passé"
              />
              {errors.actual && <p className="text-xs text-red-600 mt-1">{errors.actual}</p>}
            </div>
          </div>
        )}

        {feedbackType === 'suggestion' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Votre idée</label>
              <textarea
                value={form.idea}
                onChange={(e) => updateField('idea', e.target.value)}
                rows={4}
                className="w-full resize-none px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Décrivez l'amélioration que vous aimeriez"
              />
              {errors.idea && <p className="text-xs text-red-600 mt-1">{errors.idea}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bénéfice attendu</label>
              <textarea
                value={form.benefit}
                onChange={(e) => updateField('benefit', e.target.value)}
                rows={3}
                className="w-full resize-none px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Pourquoi est-ce utile pour vous ?"
              />
            </div>
          </div>
        )}

        {feedbackType === 'problem' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quel problème rencontrez-vous ?</label>
              <textarea
                value={form.problem}
                onChange={(e) => updateField('problem', e.target.value)}
                rows={4}
                className="w-full resize-none px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Décrivez ce qui vous bloque"
              />
              {errors.problem && <p className="text-xs text-red-600 mt-1">{errors.problem}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Impact</label>
              <select
                value={form.impact}
                onChange={(e) => updateField('impact', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="bloquant">Bloquant</option>
                <option value="gênant">Gênant</option>
                <option value="mineur">Mineur</option>
              </select>
              {errors.impact && <p className="text-xs text-red-600 mt-1">{errors.impact}</p>}
            </div>
          </div>
        )}

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Contact (optionnel)</label>
          <input
            value={form.contact}
            onChange={(e) => updateField('contact', e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="email@exemple.com"
          />
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-gray-400">
            Nous répondons aux problèmes critiques sous 48h ouvrées.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

export default Home

