import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { 
  FiMapPin, FiPhone, FiMail, FiClock, FiStar, FiCheck, 
  FiWifi, FiCoffee, FiChevronLeft, FiChevronRight, FiShare2,
  FiHeart, FiX
} from 'react-icons/fi'
// import { salons, servicesBySalon, coiffeursBySalon, reviews } from '../../data/salons'
import { formatPrice, formatDuration, formatPriceRange } from '../../utils/helpers'
import { resolveMediaUrl } from '../../utils/media'
import { useAuth } from '../../context/AuthContext'
import { useBooking } from '../../context/BookingContext'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import apiFetch from '@/api/client'

function SalonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { setSalon, addService, resetBooking, setStep } = useBooking()
  const reduceMotion = useReducedMotion()

  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [activeTab, setActiveTab] = useState('services')

  const [salonData, setSalonData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [services, setServices] = useState([])
  const [coiffeurs, setCoiffeurs] = useState([])
  const [salonReviews, setSalonReviews] = useState([])
  const [reviewRating, setReviewRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [activeService, setActiveService] = useState(null)
  const [serviceImageIndex, setServiceImageIndex] = useState(0)

  useEffect(() => {
    let mounted = true
    const fetchSalon = async () => {
      try {
        setIsLoading(true)
        setNotFound(false)
        const res = await apiFetch(`/salons/${id}`)
        const data = res?.data ?? res
        const salon = data?.salon ?? data
        if (!mounted) return
        if (!salon) {
          setNotFound(true)
          setSalonData(null)
          setServices([])
          setCoiffeurs([])
          setSalonReviews([])
          return
        }
        setSalonData(salon)
        setServices(salon?.services || [])
        setCoiffeurs(salon?.coiffeurs || [])
        setSalonReviews(salon?.reviews || [])
      } catch (e) {
        if (!mounted) return
        setSalon(null)
        setServices([])
        setCoiffeurs([])
        setSalonReviews([])
        setNotFound(true)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    fetchSalon()
    return () => {
      mounted = false
    }
  }, [id])

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    const key = service.category || 'Autres'
    if (!acc[key]) acc[key] = []
    acc[key].push(service)
    return acc
  }, {})

  const getDayName = (day) => {
    const days = {
      monday: 'Lundi',
      tuesday: 'Mardi',
      wednesday: 'Mercredi',
      thursday: 'Jeudi',
      friday: 'Vendredi',
      saturday: 'Samedi',
      sunday: 'Dimanche'
    }
    return days[day]
  }

  const amenityIcons = {
    wifi: <FiWifi />,
    café: <FiCoffee />,
    climatisation: '❄️',
    parking: '🅿️',
    'cartes acceptées': '💳',
    spa: '🧖‍♀️'
  }

  const handleBookNow = () => {
    setSalon(salonData)
    if (isAuthenticated) {
      navigate(`/booking/${salonData.id}`)
    } else {
      navigate('/login', { state: { from: { pathname: `/booking/${salonData.id}` } } })
    }
  }

  const openService = (service) => {
    setActiveService(service)
    setServiceImageIndex(0)
  }

  const handleReserveService = (service) => {
    if (!service || !salonData) return
    resetBooking()
    setSalon(salonData)
    addService(service)
    setStep(2)
    if (isAuthenticated) {
      navigate(`/booking/${salonData.id}`)
    } else {
      navigate('/login', { state: { from: { pathname: `/booking/${salonData.id}` } } })
    }
  }

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/salons/${id}` } } })
      return
    }
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError('Veuillez sélectionner une note entre 1 et 5')
      return
    }
    setReviewSubmitting(true)
    setReviewError('')
    try {
      await apiFetch(`/salons/${id}/reviews`, {
        method: 'POST',
        body: { rating: reviewRating, comment: reviewComment?.trim() || '' }
      })

      const refreshed = await apiFetch(`/salons/${id}`)
      const data = refreshed?.data ?? refreshed
      const salon = data?.salon ?? data
      setSalonData(salon)
      setServices(salon?.services || [])
      setCoiffeurs(salon?.coiffeurs || [])
      setSalonReviews(salon?.reviews || [])

      setReviewRating(0)
      setHoverRating(0)
      setReviewComment('')
    } catch (e) {
      setReviewError(e.message || 'Erreur lors de l\'envoi de l\'avis')
    } finally {
      setReviewSubmitting(false)
    }
  }

  // Prefer gallery images from backend, fallback to images array
  const galleryImages = salonData?.gallery?.length
    ? salonData.gallery.map(img => resolveMediaUrl(img.media || img.url)).filter(Boolean)
    : (salonData?.images || (salonData?.image ? [resolveMediaUrl(salonData.image)] : []))

  const getServiceImages = (service) => {
    const list = []
    const rawImages = Array.isArray(service?.images) ? service.images : []
    rawImages.forEach((img) => {
      const url = img?.url || img?.media || img?.imageUrl || img
      if (url) list.push(url)
    })
    if (service?.imageUrl || service?.media || service?.picture) {
      list.unshift(service.imageUrl || service.media || service.picture)
    }
    return Array.from(new Set(list.filter(Boolean))).map(resolveMediaUrl)
  }

  const openingHoursMap = useMemo(() => {
    if (!salonData?.openingHours) return {}
    if (!Array.isArray(salonData.openingHours)) return salonData.openingHours
    const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const map = {}
    salonData.openingHours.forEach((h) => {
      const key = keys[h.dayOfWeek]
      if (!key) return
      map[key] = h.isClosed ? null : { open: h.openTime, close: h.closeTime }
    })
    return map
  }, [salonData])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (notFound || !salonData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Salon non trouvé</h2>
          <Link to="/salons" className="btn-primary">Retour aux salons</Link>
        </div>
      </div>
    )
  }
  const salon = salonData || {}
  const servicesMinPrice = services.length ? Math.min(...services.map(s => s.price || 0)) : null
  const servicesMaxPrice = services.length ? Math.max(...services.map(s => s.price || 0)) : null
  const minPrice = salon.minPrice ?? servicesMinPrice
  const maxPrice = salon.maxPrice ?? servicesMaxPrice
  const priceLabel = formatPriceRange(minPrice, maxPrice)
  const priceText = priceLabel === '—' ? 'Tarifs sur place' : priceLabel
  const reviewCount = salon.reviewCount ?? salonReviews.length
  const computedRating = typeof salon.rating === 'number'
    ? salon.rating
    : (reviewCount ? salonReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewCount : 0)
  const hasRating = reviewCount > 0 && computedRating > 0
  const ratingLabel = hasRating ? computedRating.toFixed(1) : 'Nouveau'
  const ratingHint = hasRating ? `${reviewCount} avis` : 'Soyez le premier à noter'
  const activeServiceImages = activeService ? getServiceImages(activeService) : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/20 pt-16 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-orange-100/20 rounded-full blur-3xl"></div>
      
      {/* Image Gallery */}
      <div className="relative z-10 h-[320px] md:h-[420px] lg:h-[520px] max-h-[60vh] bg-gray-900 overflow-hidden rounded-b-[32px] shadow-[0_30px_80px_-50px_rgba(15,23,42,0.6)]">
        {galleryImages.length > 0 ? (
          <img
            src={galleryImages[currentImageIndex]}
            alt={salonData.name}
            className="w-full h-full object-cover object-center brightness-[0.98] contrast-[1.05]"
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">Aucune image</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_55%)]" />
        {/* Navigation arrows */}
        {galleryImages.length > 1 && (
          <>
            <button
              onClick={() => setCurrentImageIndex(prev => prev === 0 ? galleryImages.length - 1 : prev - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white"
              aria-label="Image précédente"
            >
              <FiChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setCurrentImageIndex(prev => (prev + 1) % galleryImages.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white"
              aria-label="Image suivante"
            >
              <FiChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
        {/* Image dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
          {galleryImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentImageIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentImageIndex ? 'bg-white w-6' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
        {/* Actions */}
        <div className="absolute top-5 right-5 flex space-x-2">
          <button className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white">
            <FiShare2 className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white">
            <FiHeart className="w-5 h-5" />
          </button>
        </div>
        <div className="absolute bottom-5 left-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Galerie {galleryImages.length || 0} photo{galleryImages.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 pb-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.4 }}
              className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl border border-white/60 ring-1 ring-black/5 p-7"
            >
              <div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 mb-5" />
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{salon.name}</h1>
                    {salon.verified && (
                      <span className="bg-green-100 text-green-600 p-1 rounded-full">
                        <FiCheck className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-gray-500">
                    <div className="flex items-center">
                      <FiMapPin className="w-4 h-4 mr-1" />
                      <span>{[salon.address, salon.city].filter(Boolean).join(', ')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 bg-yellow-50 px-3 py-2 rounded-xl">
                  <FiStar className="w-5 h-5 text-yellow-500 fill-current" />
                  <div className="leading-tight">
                    <span className="font-bold text-lg">{ratingLabel}</span>
                    <span className="block text-xs text-gray-500">
                      {ratingHint}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 mb-4">{salon.description}</p>

              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                  {services.length} services
                </span>
                {priceLabel !== '—' && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                    {priceLabel}
                  </span>
                )}
                {hasRating ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700">
                    Note {ratingLabel}/5 ({reviewCount})
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    Soyez le premier à noter
                  </span>
                )}
              </div>

              {/* Specialties */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(salon.specialties || []).map((specialty, i) => (
                  <span key={i} className="bg-primary-50 text-primary-600 px-3 py-1 rounded-full text-sm">
                    {specialty}
                  </span>
                ))}
              </div>

              {/* Amenities */}
              <div className="flex flex-wrap gap-3">
                {(salon.amenities || []).map((amenity, i) => (
                  <div key={i} className="flex items-center space-x-1 text-gray-600 text-sm">
                    <span>{amenityIcons[amenity] || '✓'}</span>
                    <span className="capitalize">{amenity}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Tabs */}
            <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="flex gap-2 p-2 bg-gray-50 border-b border-gray-100">
                {['services', 'equipe', 'avis'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 rounded-xl text-center font-semibold transition-colors ${
                      activeTab === tab
                        ? 'bg-white text-primary-700 shadow-sm border border-gray-100'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'services' && 'Services'}
                    {tab === 'equipe' && 'Équipe'}
                    {tab === 'avis' && `Avis (${salonReviews.length})`}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Services Tab */}
                {activeTab === 'services' && (
                  <div className="space-y-6">
                    {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                      <div key={category}>
                        <h3 className="font-semibold text-lg text-gray-900 mb-3">{category}</h3>
                        <div className="space-y-3">
                          {categoryServices.map((service) => {
                            const serviceImages = getServiceImages(service)
                            const preview = serviceImages[0]
                            return (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => openService(service)}
                                className="w-full text-left flex items-center justify-between gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md hover:-translate-y-0.5 transition-all group"
                              >
                                <div className="flex items-center gap-4">
                                  {preview ? (
                                    <img
                                      src={preview}
                                      alt={service.name}
                                      className="w-16 h-16 rounded-2xl object-cover border border-white shadow-sm"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400">
                                      Photo
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="font-medium text-gray-900">{service.name}</h4>
                                    <p className="text-sm text-gray-500">{formatDuration(service.duration)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-primary-600">{formatPrice(service.price)}</span>
                                  <span className="text-xs text-gray-400 group-hover:text-primary-600">Voir détails</span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Team Tab */}
                {activeTab === 'equipe' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {coiffeurs.map((coiffeur, idx) => {
                      const name = coiffeur.user?.name || coiffeur.name || 'Coiffeur'
                      const avatar = coiffeur.user?.picture || coiffeur.picture || coiffeur.avatar
                      const rating = typeof coiffeur.rating === 'number' ? coiffeur.rating : null
                      return (
                        <motion.div
                          key={coiffeur.id || idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: reduceMotion ? 0 : idx * 0.04, duration: reduceMotion ? 0 : 0.25 }}
                          className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-100/50 rounded-full blur-2xl" />
                          <div className="flex items-center gap-4">
                            {avatar ? (
                              <img
                                src={resolveMediaUrl(avatar)}
                                alt={name}
                                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl">
                                {String(name).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900 truncate">{name}</h4>
                                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                                  Disponible
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 truncate">{coiffeur.specialty || 'Expert'}</p>
                              <div className="flex items-center gap-2 mt-2 text-sm">
                                <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
                                <span className="font-semibold text-gray-700">{rating != null ? rating.toFixed(1) : '—'}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-gray-500">{coiffeur.experience || '—'}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'avis' && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900">Laisser un avis</h4>
                        <span className="text-xs text-gray-500">Votre avis aide la communauté</span>
                      </div>

                      {!isAuthenticated ? (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <p className="text-sm text-gray-600">
                            Connectez-vous pour noter ce salon et partager votre expérience.
                          </p>
                          <button
                            onClick={() => navigate('/login', { state: { from: { pathname: `/salons/${id}` } } })}
                            className="px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
                          >
                            Se connecter
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const active = (hoverRating || reviewRating) >= star
                                return (
                                  <button
                                    key={star}
                                    type="button"
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setReviewRating(star)}
                                    className="p-1"
                                    aria-label={`Noter ${star} étoile${star > 1 ? 's' : ''}`}
                                  >
                                    <FiStar className={`${active ? 'text-yellow-500 fill-current' : 'text-gray-300'} w-6 h-6`} />
                                  </button>
                                )
                              })}
                            </div>
                            <span className="text-sm text-gray-600">
                              {reviewRating > 0 ? `${reviewRating}/5` : 'Choisissez une note'}
                            </span>
                          </div>
                          <textarea
                            rows={4}
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Décrivez votre expérience : accueil, ponctualité, résultat, ambiance."
                            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          {reviewError && (
                            <p className="text-sm text-red-600 mt-2">{reviewError}</p>
                          )}
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs text-gray-400">Vous pouvez modifier votre avis plus tard.</span>
                            <button
                              onClick={handleSubmitReview}
                              disabled={reviewSubmitting}
                              className="px-5 py-2 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                            >
                              {reviewSubmitting ? 'Envoi...' : 'Publier l\'avis'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {salonReviews.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FiStar className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 mb-2">Aucun avis pour le moment</p>
                        <p className="text-sm text-gray-400">Soyez le premier à laisser un avis après votre visite !</p>
                      </div>
                    ) : (
                      salonReviews.map(review => {
                        const reviewerName = review.user?.name || review.userName || 'Client'
                        const reviewDate = review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString('fr-FR')
                          : review.date
                        return (
                        <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold">
                              {String(reviewerName).charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900">{reviewerName}</h4>
                                {review.verified && (
                                  <span className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-full">Vérifié</span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="flex text-yellow-500">
                                  {[...Array(review.rating)].map((_, i) => (
                                    <span key={i}>★</span>
                                  ))}
                                </div>
                                <span className="text-sm text-gray-400">{reviewDate}</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-600">{review.comment}</p>
                        </div>
                      )})
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Book Now Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.2, duration: reduceMotion ? 0 : 0.35 }}
              className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6 sticky top-24 border border-white/70 ring-1 ring-black/5"
            >
              <div className="text-center mb-6">
                <span className="text-xs uppercase tracking-wide text-gray-500">À partir de</span>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">{priceText}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {services.length} service{services.length > 1 ? 's' : ''} · {ratingHint}
                </p>
              </div>

              <button
                onClick={handleBookNow}
                className="w-full mb-4 rounded-xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white font-semibold py-3.5 shadow-lg hover:shadow-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
              >
                Réserver maintenant
              </button>

              {/* WhatsApp Button */}
              {salon.whatsapp && (
                <a
                  href={`https://wa.me/${salon.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-full transition-colors mb-4"
                >
                  <span>💬</span>
                  <span>Contacter sur WhatsApp</span>
                </a>
              )}

              {/* Contact */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <a
                  href={`tel:${salon.phone}`}
                  className="flex items-center space-x-3 text-gray-600 hover:text-primary-600"
                >
                  <FiPhone className="w-5 h-5" />
                  <span>{salon.phone}</span>
                </a>
                <a
                  href={`mailto:${salon.email}`}
                  className="flex items-center space-x-3 text-gray-600 hover:text-primary-600"
                >
                  <FiMail className="w-5 h-5" />
                  <span>{salon.email}</span>
                </a>
                {/* Google Maps link */}
                {salon.coordinates && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${salon.coordinates.lat},${salon.coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 text-gray-600 hover:text-primary-600"
                  >
                    <FiMapPin className="w-5 h-5" />
                    <span>Voir sur Google Maps</span>
                  </a>
                )}
              </div>

              {/* Opening Hours */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <FiClock className="w-5 h-5 mr-2" />
                  Horaires d'ouverture
                </h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(openingHoursMap).map(([day, hours]) => (
                    <div key={day} className="flex justify-between">
                      <span className="text-gray-600">{getDayName(day)}</span>
                      <span className={hours ? 'text-gray-900' : 'text-red-500'}>
                        {hours ? `${hours.open} - ${hours.close}` : 'Fermé'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {activeService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setActiveService(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }}
              className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide">
                    {activeService.category || 'Service'}
                  </p>
                  <h3 className="text-xl font-extrabold text-gray-900">{activeService.name}</h3>
                </div>
                <button
                  onClick={() => setActiveService(null)}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                >
                  <FiX className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-0">
                <div className="relative bg-gray-100">
                  {activeServiceImages.length > 0 ? (
                    <img
                      src={activeServiceImages[serviceImageIndex]}
                      alt={activeService.name}
                      className="w-full h-64 md:h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-64 md:h-full flex items-center justify-center text-gray-400">
                      Aucune image
                    </div>
                  )}

                  {activeServiceImages.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setServiceImageIndex((prev) =>
                            prev === 0 ? activeServiceImages.length - 1 : prev - 1
                          )
                        }
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow"
                      >
                        <FiChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          setServiceImageIndex((prev) =>
                            (prev + 1) % activeServiceImages.length
                          )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow"
                      >
                        <FiChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                        {activeServiceImages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setServiceImageIndex(i)}
                            className={`h-2 rounded-full transition-all ${
                              i === serviceImageIndex ? 'w-6 bg-white' : 'w-2 bg-white/60'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-extrabold text-gray-900">
                      {formatPrice(activeService.price)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDuration(activeService.duration)}
                    </span>
                  </div>

                  {activeService.description && (
                    <p className="text-gray-600">{activeService.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {activeService.depositPercentage != null && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                        Acompte {activeService.depositPercentage}%
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                      Service premium
                    </span>
                  </div>

                  <button
                    onClick={() => handleReserveService(activeService)}
                    className="w-full btn-primary"
                  >
                    Réserver ce service
                  </button>
                  <button
                    onClick={() => setActiveService(null)}
                    className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Voir plus tard
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SalonDetail
