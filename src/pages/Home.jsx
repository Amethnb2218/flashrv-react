import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { FiSearch, FiMapPin, FiCalendar, FiStar, FiArrowRight, FiCheck, FiNavigation, FiShield, FiUsers, FiClock, FiZap, FiMessageSquare, FiAlertTriangle, FiX, FiShoppingBag, FiCamera, FiScissors, FiDroplet, FiFeather, FiEdit3, FiHeart, FiLink, FiAperture, FiLayers } from 'react-icons/fi'
import SalonCard from '../components/Salon/SalonCard'
import toast from 'react-hot-toast'
import apiFetch from '@/api/client'
import { heroShowcaseItems } from '../config/heroShowcase'
import heroSalonBoutique from '../assets/hero-salon-boutique.svg'

function Home() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [heroImageFailed, setHeroImageFailed] = useState(false)
  const reduceMotion = useReducedMotion()
  const [feedbackModal, setFeedbackModal] = useState({ open: false, type: 'suggestion' })
  const [feedbackModalKey, setFeedbackModalKey] = useState(0)
  const categoryIcons = {
    barber: FiScissors,
    shooting: FiCamera,
    tresses: FiAperture,
    tissage: FiLayers,
    locks: FiLink,
    soins: FiDroplet,
    maquillage: FiEdit3,
    ongles: FiHeart,
    evenementiel: FiStar,
    naturel: FiFeather,
  }

  const [salons, setSalons] = useState([])
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
      } catch (e) {
        if (!mounted) return
        setSalons([])
      } finally {
        if (mounted) setLoadingSalons(false)
      }
    }
    fetchSalons()
    return () => {
      mounted = false
    }
  }, [])

  const onlySalons = useMemo(
    () => salons.filter((s) => String(s.businessType || 'SALON').trim().toUpperCase() !== 'BOUTIQUE'),
    [salons]
  )
  const onlyBoutiques = useMemo(
    () => salons.filter((s) => String(s.businessType || '').trim().toUpperCase() === 'BOUTIQUE'),
    [salons]
  )

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
  const tightenBoutiquesGrid = !loadingSalons && featuredBoutiques.length === 2
  const featuredSalonWrapClass = 'w-full max-w-[408px] mx-auto'
  const featuredBoutiqueWrapClass = 'w-full max-w-[320px] mx-auto'
  const featuredBoutiqueContainerClass = tightenBoutiquesGrid
    ? 'mx-auto max-w-[790px]'
    : centerBoutiquesGrid
      ? 'mx-auto max-w-md'
      : ''

  const totalReviews = salons.reduce((sum, s) => sum + (s.reviewCount || 0), 0)
  const avgRating = salons.length
    ? (totalReviews > 0
      ? (salons.reduce((sum, s) => sum + (s.rating || 0), 0) / salons.length).toFixed(1)
      : 'Nouveau')
    : '-'
  const stats = [
    { value: `${onlySalons.length}`, label: 'Salons partenaires', show: onlySalons.length > 0 },
    { value: `${onlyBoutiques.length}`, label: 'Boutiques', show: onlyBoutiques.length > 0 },
    { value: `${totalReviews}`, label: 'Avis clients', show: totalReviews > 0 },
    { value: avgRating, label: 'Note moyenne', show: avgRating !== 'Nouveau' && avgRating !== '-' }
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
    { icon: <FiUsers className="w-5 h-5" />, title: 'Salons vérifiés', desc: 'Prestations, avis et profils contrôlés.' },
    { icon: <FiShoppingBag className="w-5 h-5" />, title: 'Boutiques partenaires', desc: 'Produits beauté, cheveux et accessoires.' },
    { icon: <FiShield className="w-5 h-5" />, title: 'Parcours centralisé', desc: 'Réservation et shopping sur une seule interface.' },
  ]

  const quickFilters = [
    { label: 'Boutiques', hint: 'Produits et marques', icon: <FiShoppingBag className="w-4 h-4" />, params: { businessType: 'BOUTIQUE' } },
    { label: 'Top notes', hint: 'Adresses les mieux évaluées', icon: <FiStar className="w-4 h-4" />, params: { sortBy: 'rating' } },
    { label: 'Barbershop', hint: 'Coupe et barbe', icon: <FiScissors className="w-4 h-4" />, params: { type: 'barber' } },
  ]

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return salons
      .filter((s) => (s.name || '').toLowerCase().includes(q))
      .slice(0, 5)
  }, [salons, searchQuery])

  const heroAvgRating = totalReviews > 0
    ? (salons.reduce((sum, s) => sum + (s.rating || 0), 0) / salons.length).toFixed(1)
    : 'Nouveau'

  const heroStats = [
    { value: `${onlySalons.length}`, label: 'Salons partenaires', show: onlySalons.length > 0 },
    { value: `${onlyBoutiques.length}`, label: 'Boutiques', show: onlyBoutiques.length > 0 },
    { value: `${totalReviews}`, label: 'Avis clients', show: totalReviews > 0 },
    { value: heroAvgRating, label: 'Note moyenne', show: heroAvgRating !== 'Nouveau' }
  ].filter((item) => item.show)

  const heroTrustItems = [
    { icon: <FiCalendar className="w-5 h-5" />, title: 'Rendez-vous simplifiés', desc: 'Salons, barbershops, locks et soins accessibles plus vite.' },
    { icon: <FiShoppingBag className="w-5 h-5" />, title: 'Boutiques partenaires', desc: 'Produits, accessoires et essentiels beauté sur la même plateforme.' },
    { icon: <FiShield className="w-5 h-5" />, title: 'Parcours centralisé', desc: 'Avis, réservation et shopping reliés sur une interface plus claire.' },
  ]

  const homeCategoryLinks = [
    { id: 'all', name: 'Tous', to: '/salons', icon: <FiSearch className="w-4 h-4" /> },
    { id: 'hair', name: 'Salons coiffure', to: '/salons?search=coiffure', icon: <FiScissors className="w-4 h-4" /> },
    { id: 'beauty', name: 'Salons beauté', to: '/salons?search=beaute', icon: <FiHeart className="w-4 h-4" /> },
    { id: 'hair-beauty', name: 'Coiffure & beauté', to: '/salons?search=coiffure%20beaute', icon: <FiUsers className="w-4 h-4" /> },
    { id: 'barbershop', name: 'Barbershops', to: '/salons?type=barber', icon: <FiScissors className="w-4 h-4" /> },
    { id: 'photo', name: 'Studios photo', to: '/salons?category=shooting', icon: <FiCamera className="w-4 h-4" /> },
    { id: 'shops', name: 'Boutiques', to: '/salons?businessType=BOUTIQUE', icon: <FiShoppingBag className="w-4 h-4" /> },
  ]
  const visibleHomeCategoryLinks = showAllCategories ? homeCategoryLinks : homeCategoryLinks.slice(0, 3)
  const hasMoreHomeCategories = homeCategoryLinks.length > 3

  const heroSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []

    return salons
      .filter((s) => {
        const typeLabel = String(s.businessType || 'SALON').trim().toUpperCase() === 'BOUTIQUE' ? 'boutique' : 'salon'
        const haystack = [
          s.name,
          s.city,
          s.address,
          s.category,
          s.type,
          typeLabel,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystack.includes(q)
      })
      .slice(0, 6)
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
      toast.error("La géolocalisation n'est pas supportée par votre navigateur.")
      return
    }

    if (window.isSecureContext === false) {
      toast.error("La géolocalisation nécessite une connexion sécurisée (HTTPS).", { duration: 5000 })
      return
    }

    setIsLocating(true)

    const onSuccess = (position) => {
      const { latitude, longitude } = position.coords
      toast.success('Position trouvée.')
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
      toast('Position non disponible. Affichage de tous les salons.', { id: 'geo-fallback', duration: 3000 })
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
    <div className="overflow-hidden bg-[#fff8ef] text-[17px] dark:bg-[#1b120b] dark:text-[#fff4e3]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#ead7ba] bg-[radial-gradient(circle_at_82%_20%,rgba(231,133,20,0.08),transparent_42%),linear-gradient(180deg,#fffdf8_0%,#fff4e3_100%)] dark:border-[#62462a] dark:bg-[radial-gradient(circle_at_18%_16%,rgba(255,203,69,0.12),transparent_28%),linear-gradient(180deg,rgba(42,28,15,0.98)_0%,rgba(27,18,11,1)_100%)]">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-9 md:pb-11">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_500px] xl:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.6 }}
              className="relative z-10"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9d4f0d] dark:text-[#f0c77d] sm:text-xs">
                Réservation, shopping, confirmation
              </p>
              <h1 className="mt-2.5 max-w-[14ch] text-[1.9rem] font-bold leading-[0.94] text-[#2a1808] sm:text-[2.4rem] lg:text-[2.9rem] xl:text-[3.1rem] dark:text-[#fff4e3]">
                Salons ou Boutiques : gérez tout en quelques clics.
              </h1>
              <p className="hidden">
                Trouvez une adresse vérifiée près de chez vous, comparez les soins et confirmez votre créneau dans un seul mouvement, sans appels ni attente.
              </p>
              {heroStats.length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:max-w-[32rem] xl:grid-cols-4">
                  {heroStats.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-none border border-[#ead7ba] bg-[#fff8ee] px-3 py-2 shadow-[0_18px_34px_-28px_rgba(157,79,13,0.12)] dark:border-[#7a5932] dark:bg-[#2b1b0f]"
                    >
                      <p className="text-[1.4rem] font-bold leading-none text-primary-900 dark:text-white sm:text-[1.55rem]">{item.value}</p>
                      <p className="mt-1 text-[0.88rem] uppercase tracking-[0.08em] text-primary-800 dark:text-white/72 sm:text-[0.92rem]">{item.label}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSearch} className="mt-4 max-w-[36rem] rounded-none border border-[#ead7ba] bg-[#fff8ee] p-3 sm:p-3.5 text-[#2a1808] shadow-[0_24px_48px_-36px_rgba(157,79,13,0.24)] dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3]">
                <div className="flex flex-col gap-2 border-b border-[#ead7ba] pb-2.5 sm:flex-row sm:items-start sm:justify-between dark:border-[#62462a]">
                  <div>
                    <p className="text-[1.05rem] font-semibold text-[#2a1808] dark:text-[#fff4e3] sm:text-[1.12rem]">Recherchez un salon, une boutique ou un produit</p>
                    <p className="hidden">
                      Suggestions instantanées, géolocalisation et raccourcis utiles dans la même carte.
                    </p>
                    <p className="mt-1 max-w-[28rem] text-[0.98rem] leading-7 text-primary-700 dark:text-[#f0c77d] sm:text-[1rem]">
                      Quartier, prestation, marque ou accessoire: la même recherche pour réserver un rendez-vous ou trouver une boutique.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 self-start rounded-none border border-[#ead7ba] bg-[#fff8ee] px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9d4f0d] dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#ffd978] sm:text-xs">
                    <FiZap className="h-3.5 w-3.5 text-[#c96a0b] dark:text-[#ffd978]" />
                    Parcours unifié
                  </div>
                </div>

                <div className="mt-2.5 grid gap-2 md:grid-cols-[minmax(0,1fr)_170px]">
                  <div className="flex-1 relative">
                    <FiMapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-500 dark:text-[#f0c77d]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                      aria-label="Rechercher un salon, une boutique ou un produit"
                      aria-autocomplete="list"
                      aria-expanded={showSuggestions && heroSuggestions.length > 0}
                      aria-controls="home-suggestions"
                      placeholder="Quartier, ville, salon, boutique, produit..."
                      className="w-full rounded-none border border-[#ead7ba] bg-[#fff8ee] py-3.5 pl-12 pr-4 text-base text-primary-900 outline-none transition-all placeholder:text-primary-500 focus:border-[#d97706] focus:ring-2 focus:ring-[#f5a133]/20 dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:placeholder:text-[#d6b081] dark:focus:border-[#ffd978] dark:focus:ring-[#ffd978]/10"
                    />
                    <AnimatePresence>
                      {showSuggestions && heroSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: reduceMotion ? 0 : 0.2 }}
                          className="absolute z-20 mt-2 w-full rounded-none border border-[#ead7ba] bg-[#fff8ee] p-2 shadow-[0_24px_48px_-30px_rgba(157,79,13,0.2)] dark:border-[#f0c77d] dark:bg-[#2b1b0f]"
                          role="listbox"
                          id="home-suggestions"
                        >
                          {heroSuggestions.map((salon) => (
                            <button
                              key={salon.id}
                              type="button"
                              onMouseDown={() => navigate(`/salon/${salon.id}`)}
                              className="w-full px-3 py-2 text-left text-[#2a1808] transition-colors hover:bg-[#fff1de] dark:text-[#fff4e3] dark:hover:bg-[#3a2615]"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-base font-semibold text-primary-900 dark:text-white">{salon.name}</p>
                                    <span className="border border-[#ead7ba] bg-[#fff8ee] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-700 dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3]">
                                      {String(salon.businessType || 'SALON').trim().toUpperCase() === 'BOUTIQUE' ? 'Boutique' : 'Salon'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-primary-600 dark:text-[#f0d5b0]">{salon.city || salon.address || "Jolof'Era"}</p>
                                </div>
                                <span className="whitespace-nowrap text-sm font-semibold text-primary-800 dark:text-[#fff4e3]">
                                  {salon.reviewCount ? `Note ${Number(salon.rating || 0).toFixed(1)}` : 'À voir'}
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
                    className="flex min-h-[52px] items-center justify-center gap-2 rounded-none border border-[#ead7ba] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-primary-900 transition-all hover:-translate-y-0.5 hover:border-[#d9b17c] hover:bg-[#fff2df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97706] focus-visible:ring-offset-2 dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:hover:bg-[#3a2615] dark:focus-visible:ring-[#ffd978] dark:focus-visible:ring-offset-[#2b1b0f]"
                  >
                    <FiSearch className="w-5 h-5" />
                    <span>Rechercher</span>
                    <FiArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1.5 text-[0.92rem] text-primary-900 md:grid-cols-3 dark:text-[#fff4e3]">
                  <span className="inline-flex min-h-[32px] items-center gap-1 border border-[#ead7ba] bg-[#fff8ee] px-2.5 py-1.5 dark:border-[#f0c77d] dark:bg-[#2b1b0f]">
                    <FiCheck className="h-3 w-3 text-primary-800 dark:text-[#ffd978]" />
                    Suggestions par salon, boutique ou marque
                  </span>
                  <span className="inline-flex min-h-[32px] items-center gap-1 border border-[#ead7ba] bg-[#fff8ee] px-2.5 py-1.5 dark:border-[#f0c77d] dark:bg-[#2b1b0f]">
                    <FiShield className="h-3 w-3 text-primary-800 dark:text-[#ffd978]" />
                    Réservation et achats centralisés
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuickFilter({ sortBy: 'rating' })}
                    className="inline-flex min-h-[32px] items-center gap-1 border border-[#ead7ba] bg-[#fff8ee] px-2.5 py-1.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#d9b17c] hover:bg-[#fff2df] dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:hover:bg-[#3a2615]"
                  >
                    <FiStar className="h-3 w-3 text-primary-800 dark:text-[#ffd978]" />
                    Adresses les mieux notées
                  </button>
                </div>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.2 }}
              className="order-last xl:order-none"
            >
              <div className="mx-auto w-full max-w-[520px]">
                <HeroShowcase />
                {false && (
                <div className="aspect-[1/1.02] overflow-hidden border border-[#ead7ba] bg-[#fff0db] p-0 shadow-[0_28px_56px_-38px_rgba(157,79,13,0.24)] dark:border-[#f0c77d] dark:bg-[#2b1b0f]">
                  {heroImageFailed ? (
                    <div className="flex h-full w-full flex-col justify-end bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.92),_rgba(255,239,214,0.96)_42%,_rgba(255,223,180,1)_100%)] p-8 text-[#2a1808] dark:bg-[radial-gradient(circle_at_top_right,_rgba(255,215,160,0.08),_rgba(53,34,21,0.96)_42%,_rgba(27,18,11,1)_100%)] dark:text-[#fff4e3]">
                      <span className="inline-flex w-fit items-center border border-[#ead7ba] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] dark:border-[#f0c77d] dark:bg-[#352313]">
                        Jolof&apos;Era
                      </span>
                      <h2 className="mt-4 max-w-[12ch] text-4xl font-bold leading-tight">
                        Réservez, achetez, confirmez.
                      </h2>
                      <p className="mt-3 max-w-md text-base leading-7 text-[#5f4630] dark:text-[#f0d5b0]">
                        Une même page pour trouver un salon, une boutique ou un produit sans casser le parcours.
                      </p>
                    </div>
                  ) : (
                    <img
                      src={heroSalonBoutique}
                      alt="Illustration Jolof'Era mêlant salon et boutique"
                      className="h-full w-full object-cover object-center"
                      loading="eager"
                      decoding="async"
                      onError={() => setHeroImageFailed(true)}
                    />
                  )}
                </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Salons */}
      <section className="border-y border-[#ead7ba] bg-white py-6 dark:border-[#62462a] dark:bg-[#1b120b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-primary-900 dark:text-white">
                Salons en vedette
              </h2>
              <p className="mt-0.5 text-base text-primary-700 dark:text-white/55">Une sélection courte pour découvrir les meilleures adresses sans vous perdre.</p>
            </div>
            {!loadingSalons && featuredSalons.length > 0 && (
              <span className="inline-flex items-center rounded-none bg-[#fff0db] px-3 py-1 text-sm font-semibold text-primary-900 dark:border dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3]">
                {featuredSalons.length} adresses à voir
              </span>
            )}
          </div>

          <div className={`grid ${featuredSalonGridClass} gap-3 justify-items-center ${centerSalonsGrid ? 'mx-auto max-w-md' : ''}`}>
            {loadingSalons ? (
              [1, 2, 3].map((i) => (
                <div key={i} className={`${featuredSalonWrapClass} bg-white dark:bg-[#2b1b0f] rounded-none border border-primary-100 dark:border-[#f0c77d] p-3 animate-pulse`}>
                  <div className="mb-3 h-32 rounded-none bg-primary-100 dark:bg-[#352313]"></div>
                  <div className="mb-2 h-3 w-2/3 rounded-none bg-primary-100 dark:bg-[#352313]"></div>
                  <div className="h-2.5 w-1/2 rounded-none bg-primary-100 dark:bg-[#352313]"></div>
                </div>
              ))
            ) : (
              featuredSalons.map((salon, i) => (
                <div key={salon.id} className={featuredSalonWrapClass}>
                  <SalonCard salon={salon} index={i} />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Featured Boutiques */}
      {(loadingSalons || featuredBoutiques.length > 0) && (
      <section className="bg-white py-6 dark:bg-[#1b120b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-primary-900 dark:text-white">
                <FiShoppingBag className="mr-1.5 inline-block text-primary-900 dark:text-white" /> Boutiques
              </h2>
              <p className="mt-0.5 text-base text-primary-700 dark:text-white">Des articles choisis pour commander vite, sans sortir du site.</p>
            </div>
            {!loadingSalons && featuredBoutiques.length > 0 && (
              <span className="inline-flex items-center rounded-none bg-[#fff0db] px-3 py-1 text-sm font-semibold text-primary-900 dark:border dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3]">
                {featuredBoutiques.length} boutiques en avant
              </span>
            )}
          </div>

          <div className={`grid ${featuredBoutiqueGridClass} gap-3 justify-items-center ${featuredBoutiqueContainerClass}`}>
            {loadingSalons ? (
              [1, 2, 3].map((i) => (
                <div key={i} className={`${featuredBoutiqueWrapClass} bg-white dark:bg-[#2b1b0f] rounded-none border border-primary-100 dark:border-[#f0c77d] p-3 animate-pulse`}>
                  <div className="mb-3 h-32 rounded-none bg-primary-100 dark:bg-[#352313]"></div>
                  <div className="mb-2 h-3 w-2/3 rounded-none bg-primary-100 dark:bg-[#352313]"></div>
                  <div className="h-2.5 w-1/2 rounded-none bg-primary-100 dark:bg-[#352313]"></div>
                </div>
              ))
            ) : (
              featuredBoutiques.map((salon, i) => (
                <div key={salon.id} className={featuredBoutiqueWrapClass}>
                  <SalonCard salon={salon} index={i} compact />
                </div>
              ))
            )}
          </div>
        </div>
      </section>
      )}

      {/* Categories */}
      <section className="bg-[linear-gradient(180deg,#fffdf8_0%,#fff4e4_100%)] py-8 dark:bg-none dark:bg-[#1b120b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-[#2a1808] md:text-xl dark:text-[#fff4e3]">Catégories</h2>
              <p className="mt-0.5 text-base text-[#1f2937] dark:text-white/55">Entrez par le style qui vous correspond, puis affinez ensuite.</p>
            </div>
            <span className="inline-flex items-center rounded-none bg-[#fff0de] px-3 py-1 text-sm font-semibold text-[#2a1808] dark:border dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3]">
              7 catégories
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {visibleHomeCategoryLinks.map((cat) => (
              <Link
                key={cat.id}
                to={cat.to}
                className="group flex min-h-[108px] flex-col items-center justify-center gap-2 rounded-none border border-[#ead7ba] bg-[#fff8ee] p-2.5 shadow-[0_18px_34px_-30px_rgba(157,79,13,0.14)] transition-all hover:-translate-y-0.5 hover:border-[#d9b17c] hover:bg-white dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:hover:bg-[#352214]"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-none border border-[#ead7ba] bg-white text-[#9d4f0d] dark:border-[#f0c77d] dark:bg-[#352214] dark:text-[#ffd978]">
                  {cat.icon}
                </span>
                <span className="text-center text-sm font-medium leading-tight text-[#2a1808] group-hover:text-[#2a1808] dark:text-[#fff4e3] dark:group-hover:text-[#fff4e3]">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
          {hasMoreHomeCategories && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAllCategories((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-none border border-[#ead7ba] bg-white px-3.5 py-2 text-sm font-semibold text-[#2a1808] transition hover:-translate-y-0.5 hover:border-[#d9b17c] hover:bg-[#fff2df] dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:hover:bg-[#352214]"
              >
                {showAllCategories ? 'Voir moins' : 'Voir plus'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-[#ead7ba] bg-[#fffaf2] py-7 dark:border-[#62462a] dark:bg-[#1b120b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="mb-3 text-center text-lg font-bold text-[#2a1808] md:text-xl dark:text-[#fff4e3]">
            Comment ça marche ?
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {steps.map((step, i) => (
              <Link
                key={i}
                to={step.link}
                className="relative cursor-pointer rounded-none border border-[#ead7ba] bg-[#fff8ee] p-3 text-center shadow-[0_16px_32px_-28px_rgba(157,79,13,0.18)] transition-all hover:-translate-y-0.5 hover:border-[#d9b17c] hover:bg-white hover:shadow-md md:p-5 dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:hover:bg-[#352214]"
              >
                <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-none border border-[#ead7ba] bg-white text-[#9d4f0d] md:mb-3 md:h-11 md:w-11 dark:border-[#f0c77d] dark:bg-[#352214] dark:text-[#ffd978]">
                  {step.icon}
                </div>
                <h3 className="mb-0.5 text-base font-bold text-[#2a1808] md:mb-1 dark:text-[#fff4e3]">{step.title}</h3>
                <p className="text-base leading-relaxed text-[#1f2937] dark:text-white/55">{step.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-y border-[#ead7ba] bg-white py-9 text-[#2a1808] dark:border-[#62462a] dark:bg-[#1b120b] dark:text-[#fff4e3]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-none border border-[#ead7ba] bg-[#fff8ee] px-5 py-6 text-center shadow-card backdrop-blur-sm md:px-8 md:py-7 dark:border-[#f0c77d] dark:bg-[#2b1b0f]">
            <h2 className="mb-1.5 text-xl font-bold text-[#2a1808] md:text-2xl dark:text-[#fff4e3]">
            Vous êtes professionnel ?
            </h2>
            <p className="mb-3 text-base text-[#1f2937] md:text-lg dark:text-white/80">
            Inscription gratuite · Sans commission · Contrôle total
            </p>
            <div className="mb-4 flex flex-wrap justify-center gap-3 text-base text-[#2a1808] dark:text-[#fff4e3]">
            {[
              'Profil vérifié',
              'Réservation 24/7',
              'Rappels auto',
              'Dashboard & stats',
            ].map((b) => (
              <div key={b} className="flex items-center gap-1.5">
                <FiCheck className="h-3.5 w-3.5 flex-shrink-0 text-[#9d4f0d] dark:text-[#ffd978]" />
                <span>{b}</span>
              </div>
            ))}
            </div>
            <Link
              to="/register?role=pro"
              className="inline-flex items-center gap-2 rounded-none border border-[#9d4f0d] bg-[#9d4f0d] px-5 py-2.5 text-sm font-bold text-[#fff4e3] transition-all hover:bg-[#7b3f10] dark:border-[#f0c77d] dark:bg-[#ffd978] dark:text-[#2a1808] dark:hover:bg-[#f5c25a]"
            >
              <span>Devenir partenaire</span>
              <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feedback */}
      <section className="bg-white py-7 text-[#2a1808] dark:bg-[#1b120b] dark:text-[#fff4e3]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-none border border-[#ead7ba] bg-[#fff8ee] p-4 text-center shadow-sm dark:border-[#f0c77d] dark:bg-[#2b1b0f]">
            <h3 className="mb-0.5 text-lg font-bold text-[#2a1808] md:text-xl dark:text-[#fff4e3]">Votre avis compte</h3>
            <p className="mb-2 text-base text-[#1f2937] dark:text-white/55">
              Bug, suggestion, amélioration: nous lisons tout.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => openFeedback('suggestion')}
                className="inline-flex items-center justify-center rounded-none border border-[#ead7ba] bg-white px-4 py-2 text-sm font-semibold text-[#2a1808] transition-all hover:bg-[#fff2df] dark:border-[#f0c77d] dark:bg-[#352214] dark:text-[#fff4e3] dark:hover:bg-[#3a2615]"
              >
                Suggestion
              </button>
              <button
                type="button"
                onClick={() => openFeedback('bug')}
                className="inline-flex items-center justify-center rounded-none border border-[#9d4f0d] bg-[#9d4f0d] px-4 py-2 text-sm font-semibold text-[#fff4e3] transition-all hover:bg-[#7b3f10] dark:border-[#f0c77d] dark:bg-[#ffd978] dark:text-[#2a1808] dark:hover:bg-[#f5c25a]"
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

function HeroShowcase() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (heroShowcaseItems.length <= 1) return undefined

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % heroShowcaseItems.length)
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [])

  const visibleItems = useMemo(() => {
    if (!heroShowcaseItems.length) return []

    return [
      heroShowcaseItems[activeIndex % heroShowcaseItems.length],
      heroShowcaseItems[(activeIndex + 1) % heroShowcaseItems.length],
      heroShowcaseItems[(activeIndex + 2) % heroShowcaseItems.length],
    ]
  }, [activeIndex])

  return (
    <div className="aspect-[1/1.06] overflow-hidden border border-[#ead7ba] bg-[#fff0db] p-2.5 shadow-[0_28px_56px_-38px_rgba(157,79,13,0.24)] sm:aspect-[1.15/1] sm:p-3 lg:aspect-[1/1.02] dark:border-[#f0c77d] dark:bg-[#2b1b0f]">
      <div className="grid h-full grid-cols-1 gap-2.5 sm:grid-cols-[1.12fr_0.88fr] sm:gap-3">
        <HeroShowcaseTile item={visibleItems[0]} large />
        <div className="grid h-full grid-cols-2 gap-2.5 sm:grid-cols-1 sm:grid-rows-2 sm:gap-3">
          <HeroShowcaseTile item={visibleItems[1]} />
          <HeroShowcaseTile item={visibleItems[2]} />
        </div>
      </div>

      <div className="pointer-events-none mt-2.5 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
        {heroShowcaseItems.map((item, index) => (
          <span
            key={item.id}
            className={`inline-flex items-center gap-2 border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${
              index === activeIndex
                ? 'border-[#d3a96f] bg-[#fff1de] text-[#9d4f0d] dark:border-[#f0c77d] dark:bg-[#352214] dark:text-[#fff0c9]'
                : 'border-[#ead7ba] bg-[#fff8ee] text-[#8d6b46] dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#d9b88c]'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 ${
                index === activeIndex
                  ? 'bg-[#d97706] dark:bg-[#ffd978]'
                  : 'bg-[#d8c1a0] dark:bg-[#8a6740]'
              }`}
            />
            {item.title}
          </span>
        ))}
      </div>
    </div>
  )
}

function HeroShowcaseTile({ item, large = false }) {
  if (!item) return null

  return (
    <AnimatePresence initial={false} mode="sync">
      <motion.div
        key={`${item.id}-${large ? 'large' : 'small'}`}
        initial={{ opacity: 0, y: 8, scale: 0.992 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.992 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`group relative overflow-hidden border border-[#ead7ba] bg-[#fff0de] dark:border-[#7a5932] dark:bg-[#352214] ${
          large ? 'min-h-[236px] sm:min-h-[320px] lg:min-h-[420px]' : 'min-h-[124px] sm:min-h-[152px] lg:min-h-[204px]'
        }`}
      >
        <motion.img
          key={`${item.id}-image-${large ? 'large' : 'small'}`}
          src={item.image}
          alt={item.title}
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          initial={{ scale: 1.03, x: 0, y: 0 }}
          animate={{
            scale: [1.03, 1.08, 1.05],
            x: [0, large ? -8 : -4, large ? 6 : 3],
            y: [0, large ? -6 : -3, large ? 4 : 2],
          }}
          transition={{
            duration: large ? 5.8 : 5.2,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'mirror',
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(42,24,8,0.04)_0%,rgba(42,24,8,0.16)_45%,rgba(42,24,8,0.84)_100%)]" />
        <motion.div
          className="absolute inset-x-0 bottom-0 p-4"
          initial={{ opacity: 0.94, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <span className="inline-flex items-center border border-white/35 bg-white/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
            {item.kind}
          </span>
          <h3 className={`mt-3 font-bold leading-tight text-white ${large ? 'text-[1.15rem] sm:text-[1.35rem] lg:text-[1.65rem]' : 'text-sm sm:text-base lg:text-lg'}`}>
            {item.title}
          </h3>
          <p className={`mt-1 text-white/80 ${large ? 'text-[12px] sm:text-sm' : 'text-[11px] sm:text-[12px] lg:text-[13px]'}`}>
            {item.query}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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
      const existingFeedback = JSON.parse(sessionStorage.getItem('flashrv_feedback') || '[]')
      sessionStorage.setItem('flashrv_feedback', JSON.stringify([...existingFeedback, feedbackData]))
      toast.error("Erreur lors de l'envoi. Nous avons gardé une copie locale.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const labelClass = 'mb-2 block text-sm font-medium text-primary-700 dark:text-white'
  const fieldClass = 'w-full rounded-none border border-primary-200 bg-white px-4 py-3 text-primary-900 placeholder:text-primary-400 focus:border-transparent focus:ring-2 focus:ring-[#f5a133] dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:placeholder:text-[#cda675] dark:focus:ring-[#ffd978]'
  const textareaClass = `${fieldClass} resize-none`
  const hintClass = 'text-sm text-primary-600 dark:text-white/62'

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-none border border-primary-100 bg-white p-8 text-center shadow-lg dark:border-[#62462a] dark:bg-[#2b1b0f]"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-none bg-[#9d4f0d] text-[#fff4e3] dark:bg-[#ffd978] dark:text-primary-900">
          <FiCheck className="h-8 w-8" />
        </div>
        <h3 className="text-2xl font-bold text-primary-800 mb-2">Envoyé</h3>
        <p className="text-primary-600 mb-6">
          Merci ! Votre retour nous aide à améliorer Jolof'Era pour tous.
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
      className="relative overflow-hidden rounded-none border border-primary-100 bg-white shadow-lg dark:border-[#62462a] dark:bg-[#2b1b0f]"
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-none border border-primary-200 transition-colors hover:bg-primary-50 dark:border-[#7a5932] dark:hover:bg-[#352214]"
          aria-label="Fermer le formulaire"
        >
          <FiX className="w-5 h-5 text-primary-600 dark:text-white" />
        </button>
      )}
      <div className="grid sm:grid-cols-3 border-b border-primary-100 dark:border-[#4a3a2c]">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => setFeedbackType(type.id)}
            className={`flex items-center justify-center gap-2 py-4 px-4 text-sm font-medium transition-all ${
              feedbackType === type.id
                ? 'border-b-2 border-[#9d4f0d] bg-[#fff0de] text-primary-900 dark:border-[#f0c77d] dark:bg-[#352214] dark:text-[#fff4e3]'
                : 'text-primary-500 hover:bg-primary-50 dark:text-white/58 dark:hover:bg-white/5'
            }`}
          >
            <span className="text-primary-900 dark:text-white">{type.icon}</span>
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8">
        <div className="mb-6">
          <p className={hintClass}>
            {types.find((t) => t.id === feedbackType)?.hint}
          </p>
        </div>

        {feedbackType === 'bug' && (
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Page concernée</label>
              <input
                value={form.page}
                onChange={(e) => updateField('page', e.target.value)}
                className={fieldClass}
                placeholder="/salon/..."
              />
              {errors.page && <p className="text-xs text-red-600 mt-1">{errors.page}</p>}
            </div>
            <div>
              <label className={labelClass}>Étapes pour reproduire</label>
              <input
                value={form.steps}
                onChange={(e) => updateField('steps', e.target.value)}
                className={fieldClass}
                placeholder="Ex. ouvrir, cliquer, ..."
              />
              {errors.steps && <p className="text-xs text-red-600 mt-1">{errors.steps}</p>}
            </div>
            <div>
              <label className={labelClass}>Résultat attendu</label>
              <textarea
                value={form.expected}
                onChange={(e) => updateField('expected', e.target.value)}
                rows={3}
                className={textareaClass}
                placeholder="Ce que vous vouliez voir"
              />
              {errors.expected && <p className="text-xs text-red-600 mt-1">{errors.expected}</p>}
            </div>
            <div>
              <label className={labelClass}>Résultat obtenu</label>
              <textarea
                value={form.actual}
                onChange={(e) => updateField('actual', e.target.value)}
                rows={3}
                className={textareaClass}
                placeholder="Ce qui s'est réellement passé"
              />
              {errors.actual && <p className="text-xs text-red-600 mt-1">{errors.actual}</p>}
            </div>
          </div>
        )}

        {feedbackType === 'suggestion' && (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Votre idée</label>
              <textarea
                value={form.idea}
                onChange={(e) => updateField('idea', e.target.value)}
                rows={4}
                className={textareaClass}
                placeholder="Décrivez l'amélioration que vous aimeriez"
              />
              {errors.idea && <p className="text-xs text-red-600 mt-1">{errors.idea}</p>}
            </div>
            <div>
              <label className={labelClass}>Bénéfice attendu</label>
              <textarea
                value={form.benefit}
                onChange={(e) => updateField('benefit', e.target.value)}
                rows={3}
                className={textareaClass}
                placeholder="Pourquoi est-ce utile pour vous ?"
              />
            </div>
          </div>
        )}

        {feedbackType === 'problem' && (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Quel problème rencontrez-vous ?</label>
              <textarea
                value={form.problem}
                onChange={(e) => updateField('problem', e.target.value)}
                rows={4}
                className={textareaClass}
                placeholder="Décrivez ce qui vous bloque"
              />
              {errors.problem && <p className="text-xs text-red-600 mt-1">{errors.problem}</p>}
            </div>
            <div>
              <label className={labelClass}>Impact</label>
              <select
                value={form.impact}
                onChange={(e) => updateField('impact', e.target.value)}
                className={fieldClass}
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
          <label className={labelClass}>Contact (optionnel)</label>
          <input
            value={form.contact}
            onChange={(e) => updateField('contact', e.target.value)}
            className={fieldClass}
            placeholder="email@exemple.com"
          />
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-primary-400 dark:text-[#cab69d]">
            Nous répondons aux problèmes critiques sous 48h ouvrées.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary-900 hover:bg-primary-800 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

export default Home




