import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { 
  FiMapPin, FiPhone, FiMail, FiClock, FiStar, FiCheck, 
  FiWifi, FiCoffee, FiChevronLeft, FiChevronRight, FiShare2,
  FiHeart, FiX, FiShoppingCart, FiBox, FiPlus, FiMinus, FiUsers,
  FiMessageSquare
} from 'react-icons/fi'
// import { salons, servicesBySalon, coiffeursBySalon, reviews } from '../../data/salons'
import { formatPrice, formatDuration, formatPriceRange } from '../../utils/helpers'
import { resolveMediaUrl } from '../../utils/media'
import { useAuth } from '../../context/AuthContext'
import { useBooking } from '../../context/BookingContext'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import apiFetch from '@/api/client'
import toast from 'react-hot-toast'
import { parseProductMeta } from '../../utils/productMeta'
import {
  addItemToCart,
  deriveDeliveryConfigFromItems,
  readCart,
  removeItemFromCart,
  subscribeCart,
} from '../../utils/cartStore'

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
  const [activeProduct, setActiveProduct] = useState(null)
  const [productImageIndex, setProductImageIndex] = useState(0)
  const articlesSectionRef = useRef(null)

  // Boutique state
  const [boutiqueProducts, setBoutiqueProducts] = useState([])
  const [cart, setCart] = useState(() => {
    const saved = readCart()
    return Array.isArray(saved?.items) ? saved.items : []
  }) // [{product, quantity, selectedSize, selectedColor}]
  const [showCartModal, setShowCartModal] = useState(false)
  const [orderForm, setOrderForm] = useState({ deliveryMode: 'PICKUP', deliveryAddress: '', clientPhone: '', clientName: '', notes: '' })
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [variantSelections, setVariantSelections] = useState({}) // { productId: { size, color } }
  const [likedProducts, setLikedProducts] = useState(() => {
    try {
      const raw = localStorage.getItem('flashrv_liked_products')
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

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
        // Fetch boutique products if applicable
        if (salon?.businessType === 'BOUTIQUE') {
          setActiveTab('articles')
          try {
            const prodRes = await apiFetch(`/products/boutique/${salon.id}`)
            const prodData = prodRes?.data ?? prodRes
            setBoutiqueProducts(Array.isArray(prodData) ? prodData : [])
          } catch (_) { /* no-op */ }
        }
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

  useEffect(() => {
    const syncCart = () => {
      const saved = readCart()
      const salonId = salonData?.id || id
      if (saved?.salon?.id && String(saved.salon.id) !== String(salonId)) {
        setCart([])
        return
      }
      setCart(Array.isArray(saved?.items) ? saved.items : [])
    }
    syncCart()
    const unsubscribe = subscribeCart(syncCart)
    return unsubscribe
  }, [id, salonData?.id])

  useEffect(() => {
    try {
      localStorage.setItem('flashrv_liked_products', JSON.stringify(likedProducts))
    } catch {
      // ignore persistence errors
    }
  }, [likedProducts])

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

  const isBoutique = salonData?.businessType === 'BOUTIQUE'

  const addToCart = (product, size, color) => {
    const selSize = size || variantSelections[product.id]?.size || null
    const selColor = color || variantSelections[product.id]?.color || null
    const cartSalon = {
      id: salonData?.id || id,
      name: salonData?.name,
      image: salonData?.image || salonData?.picture || null,
      phone: salonData?.phone || null,
      whatsapp: salonData?.whatsapp || null,
    }
    const next = addItemToCart({
      salon: cartSalon,
      product,
      quantity: 1,
      selectedSize: selSize,
      selectedColor: selColor,
    })
    setCart(next.items || [])
  }

  const removeFromCart = (productId, size, color) => {
    const next = removeItemFromCart({
      productId,
      selectedSize: size || null,
      selectedColor: color || null,
      quantity: 1,
    })
    setCart(next.items || [])
  }

  const getCartItemForProduct = (productId) => {
    return cart.filter(c => c.product.id === productId)
  }

  const normalizeOptionList = (value) => {
    if (value == null) return []

    const asStringArray = (arr) =>
      arr
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)

    if (Array.isArray(value)) return asStringArray(value)

    if (typeof value === 'string') {
      const raw = value.trim()
      if (!raw) return []

      if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('{') && raw.endsWith('}'))) {
        try {
          return normalizeOptionList(JSON.parse(raw))
        } catch (_) {
          // Fallback to delimited parsing
        }
      }

      return asStringArray(raw.split(/[;,|/]/g))
    }

    if (typeof value === 'object') {
      if (Array.isArray(value.values)) return normalizeOptionList(value.values)
      if (Array.isArray(value.options)) return normalizeOptionList(value.options)
      return asStringArray(Object.values(value))
    }

    return []
  }

  const uniqueOptions = (list) => Array.from(new Set(normalizeOptionList(list)))

  const isVariantProductCategory = (product) => {
    const normalized = String(`${product?.name || ''} ${product?.category || ''}`)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    const keywords = [
      'vetement',
      'maillot',
      'jersey',
      't-shirt',
      'shirt',
      'pull',
      'pantalon',
      'short',
      'robe',
      'tenue',
      'chaussure',
      'basket',
      'sneaker',
    ]

    return keywords.some((k) => normalized.includes(k))
  }

  const getVariantEntries = (product) => {
    const rawSource =
      product?.variantCombinations ??
      product?.variants?.combinations ??
      product?.variantOptions?.combinations ??
      product?.variants ??
      []

    let combosRaw = []
    if (Array.isArray(rawSource)) {
      combosRaw = rawSource
    } else if (typeof rawSource === 'string') {
      const parsed = (() => {
        try {
          return JSON.parse(rawSource)
        } catch (_) {
          return []
        }
      })()
      combosRaw = Array.isArray(parsed) ? parsed : []
    } else if (rawSource && typeof rawSource === 'object') {
      combosRaw = Array.isArray(rawSource.values) ? rawSource.values : []
    }

    return combosRaw
      .map((v) => ({
        size: v?.size || v?.taille || v?.labelSize || null,
        color: v?.color || v?.couleur || v?.labelColor || null,
        stock: Number(v?.stock ?? v?.quantity ?? 0),
        isAvailable: v?.isAvailable !== false && Number(v?.stock ?? v?.quantity ?? 0) > 0,
      }))
      .filter((v) => v.size || v.color)
  }

  const getResolvedVariantOptions = (product, { includeFallback = false } = {}) => {
    const variantEntries = getVariantEntries(product)
    const productMeta = parseProductMeta(product)

    const availableSizesFromCombos = uniqueOptions(variantEntries.map((v) => v.size))
    const availableColorsFromCombos = uniqueOptions(variantEntries.map((v) => v.color))

    const explicitSizes = uniqueOptions([
      ...normalizeOptionList(productMeta.sizes),
      ...normalizeOptionList(product?.sizeOptions),
      ...normalizeOptionList(product?.variants?.sizes),
      ...normalizeOptionList(product?.variants?.size),
      ...normalizeOptionList(product?.options?.sizes),
    ])
    const explicitColors = uniqueOptions([
      ...normalizeOptionList(productMeta.colors),
      ...normalizeOptionList(product?.colorOptions),
      ...normalizeOptionList(product?.variants?.colors),
      ...normalizeOptionList(product?.variants?.color),
      ...normalizeOptionList(product?.options?.colors),
    ])
    const explicitAvailableColors = uniqueOptions(productMeta.availableColors)

    let resolvedSizes = explicitSizes.length > 0 ? explicitSizes : availableSizesFromCombos
    let resolvedColors = explicitColors.length > 0 ? explicitColors : availableColorsFromCombos
    let resolvedAvailableColors =
      explicitAvailableColors.length > 0
        ? explicitAvailableColors
        : resolvedColors
    let usesFallbackSizes = false
    let usesFallbackColors = false

    if (includeFallback && isVariantProductCategory(product)) {
      if (resolvedSizes.length === 0) {
        resolvedSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
        usesFallbackSizes = true
      }
    }

    return {
      variantEntries,
      resolvedSizes,
      resolvedColors,
      resolvedAvailableColors,
      usesFallbackSizes,
      usesFallbackColors,
      deliveryMeta: productMeta,
    }
  }

  const getProductImages = (product) => {
    if (!product) return []
    const raw = [
      product.imageUrl,
      product.image,
      ...(Array.isArray(product.images)
        ? product.images.map((img) => img?.url || img?.media || img?.imageUrl || img)
        : []),
    ].filter(Boolean)
    return Array.from(new Set(raw)).map(resolveMediaUrl).filter(Boolean)
  }

  const isProductLiked = (productId) => likedProducts.includes(String(productId))

  const toggleProductLike = (productId) => {
    const key = String(productId)
    setLikedProducts((prev) =>
      prev.includes(key) ? prev.filter((idValue) => idValue !== key) : [...prev, key]
    )
  }

  const shareProduct = async (product) => {
    const shareUrl = `${window.location.origin}/salon/${id}`
    const payload = {
      title: `${product?.name || 'Article'} - ${salonData?.name || 'FlashRV'}`,
      text: `Regardez ${product?.name || 'cet article'} sur ${salonData?.name || 'la boutique'}.`,
      url: shareUrl,
    }
    try {
      if (navigator.share) {
        await navigator.share(payload)
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Lien copie dans le presse-papiers.')
      }
    } catch {
      // silent
    }
  }

  const openProductReview = () => {
    setActiveTab('avis')
    closeProductDetail()
    setTimeout(() => window.scrollTo({ top: window.scrollY + 380, behavior: 'smooth' }), 120)
  }

  const buyNow = (product, size, color) => {
    addToCart(product, size, color)
    const cartState = readCart()
    const items = Array.isArray(cartState?.items) ? cartState.items : []
    if (!cartState?.salon?.id || items.length === 0) return
    const delivery = deriveDeliveryConfigFromItems(items)
    closeProductDetail()
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
  }

  const openArticlesTab = () => {
    setActiveTab('articles')
    setTimeout(() => {
      articlesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const openProductDetail = (product) => {
    if (!product) return
    setActiveProduct(product)
    setProductImageIndex(0)
  }

  const closeProductDetail = () => {
    setActiveProduct(null)
    setProductImageIndex(0)
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0)
  const cartDeliveryConfig = deriveDeliveryConfigFromItems(cart)

  const handleSubmitOrder = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/salon/${id}` } } })
      return
    }
    if (cart.length === 0) return
    const delivery = deriveDeliveryConfigFromItems(cart)
    setShowCartModal(false)
    navigate('/order/checkout', {
      state: {
        cart,
        salon: {
          id: salonData?.id,
          name: salonData?.name,
          image: salonData?.image || salonData?.picture || null,
          phone: salonData?.phone || null,
          whatsapp: salonData?.whatsapp || null,
        },
        deliveryMode: delivery.canDeliverAll ? orderForm.deliveryMode : 'PICKUP',
        deliveryAddress: orderForm.deliveryAddress,
        clientPhone: orderForm.clientPhone,
        clientName: orderForm.clientName || user?.name,
        notes: orderForm.notes,
        forcePickup: !delivery.canDeliverAll,
        deliveryZones: delivery.deliveryZones,
        minDeliveryFee: delivery.minDeliveryFee,
      }
    })
  }

  const amenityIcons = {
    wifi: <FiWifi />,
    "caf\u00e9": <FiCoffee />,
    climatisation: 'A/C',
    parking: 'P',
    "cartes accept\u00e9es": 'CB',
    spa: 'Spa'
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
      navigate('/login', { state: { from: { pathname: `/salon/${id}` } } })
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

  // Open/closed status
  const todayDayName = (() => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return days[new Date().getDay()]
  })()
  const todayHoursDetail = useMemo(() => {
    if (!openingHoursMap || typeof openingHoursMap !== 'object') return null
    return openingHoursMap[todayDayName] || null
  }, [openingHoursMap, todayDayName])
  const isOpenNow = useMemo(() => {
    if (!todayHoursDetail) return false
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    return currentTime >= todayHoursDetail.open && currentTime <= todayHoursDetail.close
  }, [todayHoursDetail])

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
          <h2 className="text-2xl font-bold text-primary-900 mb-4">Salon non trouvé</h2>
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
    <div className="min-h-screen bg-primary-50 relative">
      {/* Image Gallery — flush under navbar */}
      <div className="relative z-10 -mt-14 h-[276px] sm:h-[396px] md:h-[420px] lg:h-[420px] max-h-[60vh] bg-primary-900 overflow-hidden">
        {galleryImages.length > 0 ? (
          <img
            src={galleryImages[currentImageIndex]}
            alt={salonData.name}
            className="w-full h-full object-cover object-center brightness-[0.98] contrast-[1.05] lg:brightness-100 lg:contrast-100"
            loading="eager"
            decoding="async"
            onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentElement.querySelector('.img-fallback')?.classList?.remove('hidden'); }}
          />
        ) : null}
        <div className={`img-fallback w-full h-full flex flex-col items-center justify-center text-primary-400 absolute inset-0 ${galleryImages.length > 0 ? 'hidden' : ''}`}>
          <svg className="w-16 h-16 mb-3 text-primary-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
          <span className="text-sm font-medium">Photo bientôt disponible</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_55%)] lg:hidden" />
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
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-white drop-shadow-lg leading-tight">{salon.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {salon.verified && (
              <span className="inline-flex items-center gap-1 bg-white/90 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                <FiCheck className="w-3 h-3" /> Vérifié
              </span>
            )}
            {todayHoursDetail ? (
              isOpenNow ? (
                <span className="inline-flex items-center gap-1 bg-emerald-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Ouvert
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-red-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">Fermé</span>
              )
            ) : null}
            <span className="inline-flex items-center gap-1 bg-white/90 text-primary-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              <FiStar className="w-3 h-3 text-gold-500 fill-current" /> {ratingLabel}
              {hasRating && <span className="text-primary-500">({reviewCount})</span>}
            </span>
            {galleryImages.length > 1 && (
              <span className="inline-flex items-center gap-1 bg-black/40 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                {currentImageIndex + 1}/{galleryImages.length}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative z-10 pb-12">
        {/* Compact info strip */}
        <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide text-xs">
          <span className="shrink-0 inline-flex items-center gap-1 text-primary-600">
            <FiMapPin className="w-3 h-3" /> {[salon.address, salon.city].filter(Boolean).join(', ') || 'Localisation'}
          </span>
          <span className="text-primary-300">•</span>
          <span className="shrink-0 font-semibold text-primary-700">
            {isBoutique ? `${boutiqueProducts.length} article${boutiqueProducts.length > 1 ? 's' : ''}` : `${services.length} services`}
          </span>
          {priceLabel !== '—' && (
            <>
              <span className="text-primary-300">•</span>
              <span className="shrink-0 font-semibold text-gold-600">{priceLabel}</span>
            </>
          )}
          {(salon.whatsapp || salon.phone) && (
            <>
              <span className="text-primary-300">•</span>
              <a
                href={`https://wa.me/${(salon.whatsapp || salon.phone).replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 text-green-600 font-semibold"
              >
                WhatsApp
              </a>
            </>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-0">

            {/* Tabs — sticky on scroll */}
            <div className="bg-white rounded-t-2xl shadow-sm border border-primary-100 overflow-hidden sticky top-16 z-20">
              <div className="flex border-b border-primary-100">
                {(isBoutique ? ['articles', 'avis', 'infos'] : ['services', 'avis', 'infos']).map(tab => (
                  <button
                    key={tab}
                    onClick={() => (tab === 'articles' ? openArticlesTab() : setActiveTab(tab))}
                    className={`flex-1 py-3 text-center text-sm font-semibold transition-colors relative ${
                      activeTab === tab
                        ? 'text-primary-900'
                        : 'text-primary-400 hover:text-primary-600'
                    }`}
                  >
                    {tab === 'services' && 'Services'}
                    {tab === 'articles' && `Articles (${boutiqueProducts.filter(p => p.isActive !== false).length})`}
                    {tab === 'avis' && `Avis (${salonReviews.length})`}
                    {tab === 'infos' && 'Infos'}
                    {activeTab === tab && (
                      <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary-900 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-b-2xl shadow-sm border border-x border-b border-primary-100 overflow-hidden">
              <div className="p-3 sm:p-5">
                {/* Services Tab */}
                {activeTab === 'services' && (
                  <div className="space-y-6">
                    {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                      <div key={category}>
                        <h3 className="font-semibold text-lg text-primary-900 mb-3">{category}</h3>
                        <div className="space-y-3">
                          {categoryServices.map((service) => {
                            const serviceImages = getServiceImages(service)
                            const preview = serviceImages[0]
                            return (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => openService(service)}
                                className="w-full text-left flex items-center justify-between gap-4 p-4 bg-white border border-primary-100 rounded-2xl hover:shadow-md hover:-translate-y-0.5 transition-all group"
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
                                    <div className="w-16 h-16 rounded-2xl bg-primary-50 border border-dashed border-primary-200 flex items-center justify-center text-xs text-primary-400">
                                      Photo
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="font-medium text-primary-900">{service.name}</h4>
                                    <p className="text-sm text-primary-500">{formatDuration(service.duration)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-primary-600">{formatPrice(service.price)}</span>
                                  <span className="text-xs text-primary-400 group-hover:text-primary-600">Voir détails</span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Articles Tab (Boutique) */}
                {activeTab === 'articles' && (
                  <div ref={articlesSectionRef} className="space-y-4">
                    {boutiqueProducts.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FiBox className="w-8 h-8 text-primary-400" />
                        </div>
                        <p className="text-primary-500">Aucun article disponible pour le moment.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {boutiqueProducts.filter(p => p.isActive !== false).map(product => {
                          const img = resolveMediaUrl(product.imageUrl || product.image)
                          const inCartItems = getCartItemForProduct(product.id)
                          const inCartTotal = inCartItems.reduce((s, c) => s + c.quantity, 0)
                          const { resolvedSizes, resolvedColors, deliveryMeta } = getResolvedVariantOptions(product)
                          const hasSizes = Array.isArray(resolvedSizes) && resolvedSizes.length > 0
                          const hasColors = Array.isArray(resolvedColors) && resolvedColors.length > 0
                          const needsVariant = (hasSizes || hasColors)
                          const isNew = product.createdAt && (Date.now() - new Date(product.createdAt).getTime()) < 7 * 86400000
                          const isLowStock = product.stock > 0 && product.stock <= 5

                          return (
                            <div
                              key={product.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => openProductDetail(product)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProductDetail(product) } }}
                              className="bg-white border border-primary-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                            >
                              {/* Image + badges overlay */}
                              <div className="relative w-full aspect-square bg-primary-50">
                                {img ? (
                                  <img src={img} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <FiBox className="w-8 h-8 text-primary-300" />
                                  </div>
                                )}
                                {/* Badges */}
                                <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                                  {isNew && <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">NOUVEAU</span>}
                                  {isLowStock && <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Stock faible</span>}
                                  {product.stock === 0 && <span className="bg-primary-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Épuisé</span>}
                                </div>
                                {/* Heart */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleProductLike(product.id) }}
                                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shadow-sm"
                                >
                                  <FiHeart className={`w-3.5 h-3.5 ${isProductLiked(product.id) ? 'text-red-500 fill-current' : 'text-primary-500'}`} />
                                </button>
                                {/* Cart badge */}
                                {inCartTotal > 0 && (
                                  <span className="absolute bottom-1.5 right-1.5 bg-gold-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">{inCartTotal}</span>
                                )}
                              </div>
                              {/* Info */}
                              <div className="p-2 sm:p-2.5">
                                <h4 className="font-semibold text-primary-900 text-xs sm:text-sm leading-tight line-clamp-1">{product.name}</h4>
                                {product.category && <p className="text-[10px] text-primary-400 mt-0.5 line-clamp-1">{product.category}</p>}
                                <div className="flex items-center justify-between mt-1.5">
                                  <span className="font-extrabold text-gold-600 text-sm">{formatPrice(product.price)}</span>
                                  {product.stock > 0 ? (
                                    inCartTotal > 0 ? (
                                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); removeFromCart(product.id) }}
                                          className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center hover:bg-primary-200 transition"
                                        >
                                          <FiMinus className="w-3 h-3" />
                                        </button>
                                        <span className="text-xs font-bold text-primary-900 min-w-[16px] text-center">{inCartTotal}</span>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); if (needsVariant) { openProductDetail(product) } else { addToCart(product) } }}
                                          className="w-6 h-6 rounded-full bg-primary-900 text-white flex items-center justify-center hover:bg-primary-800 transition"
                                        >
                                          <FiPlus className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); if (needsVariant) { openProductDetail(product) } else { addToCart(product) } }}
                                        className="w-7 h-7 rounded-full bg-primary-900 text-white flex items-center justify-center hover:bg-primary-800 transition"
                                      >
                                        <FiPlus className="w-3.5 h-3.5" />
                                      </button>
                                    )
                                  ) : (
                                    <span className="text-[10px] text-red-500 font-medium">Rupture</span>
                                  )}
                                </div>
                                {deliveryMeta?.isDeliverable && (
                                  <p className="text-[10px] text-primary-400 mt-1 flex items-center gap-0.5">
                                    <FiBox className="w-2.5 h-2.5" /> Livraison dispo
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'avis' && (
                  <div className="space-y-4">
                    <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                      <h4 className="font-semibold text-primary-900 mb-3 text-sm">Laisser un avis</h4>

                      {!isAuthenticated ? (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <p className="text-sm text-primary-600">Connectez-vous pour noter.</p>
                          <button
                            onClick={() => navigate('/login', { state: { from: { pathname: `/salon/${id}` } } })}
                            className="px-4 py-2 rounded-lg bg-primary-900 text-white text-sm font-semibold hover:bg-primary-800 transition-colors"
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
                                    className="p-0.5"
                                  >
                                    <FiStar className={`${active ? 'text-gold-500 fill-current' : 'text-primary-300'} w-5 h-5`} />
                                  </button>
                                )
                              })}
                            </div>
                            <span className="text-xs text-primary-500">{reviewRating > 0 ? `${reviewRating}/5` : ''}</span>
                          </div>
                          <textarea
                            rows={3}
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Votre expérience..."
                            className="w-full resize-none rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-900 focus:border-transparent"
                          />
                          {reviewError && <p className="text-xs text-red-600 mt-1">{reviewError}</p>}
                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={handleSubmitReview}
                              disabled={reviewSubmitting}
                              className="px-4 py-2 rounded-lg bg-primary-900 text-white text-sm font-semibold hover:bg-primary-800 transition-colors disabled:opacity-60"
                            >
                              {reviewSubmitting ? 'Envoi...' : 'Publier'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {salonReviews.length === 0 ? (
                      <div className="text-center py-8">
                        <FiStar className="w-8 h-8 text-primary-300 mx-auto mb-2" />
                        <p className="text-primary-500 text-sm">Aucun avis pour le moment</p>
                        <p className="text-xs text-primary-400 mt-1">Soyez le premier à noter !</p>
                      </div>
                    ) : (
                      salonReviews.map(review => {
                        const reviewerName = review.user?.name || review.userName || 'Client'
                        const reviewDate = review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString('fr-FR')
                          : review.date
                        return (
                        <div key={review.id} className="border-b border-primary-100 pb-3 last:border-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center text-white font-bold text-xs">
                              {String(reviewerName).charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-medium text-primary-900 text-sm">{reviewerName}</h4>
                              <div className="flex items-center gap-1">
                                <div className="flex text-gold-500">
                                  {[...Array(review.rating)].map((_, i) => (
                                    <FiStar key={i} className="w-3 h-3 fill-current" />
                                  ))}
                                </div>
                                <span className="text-xs text-primary-400">{reviewDate}</span>
                              </div>
                            </div>
                          </div>
                          {review.comment && <p className="text-sm text-primary-600 ml-10">{review.comment}</p>}
                        </div>
                      )})
                    )}
                  </div>
                )}

                {/* Infos Tab — description, team, contact, hours, payment */}
                {activeTab === 'infos' && (
                  <div className="space-y-5">
                    {/* Description */}
                    {salon.description && (
                      <div>
                        <h4 className="font-semibold text-primary-900 text-sm mb-2">À propos</h4>
                        <p className="text-sm text-primary-600 leading-relaxed">{salon.description}</p>
                      </div>
                    )}

                    {/* Specialties */}
                    {(salon.specialties || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {salon.specialties.map((s, i) => (
                          <span key={i} className="bg-primary-100 text-primary-700 px-2.5 py-1 rounded-full text-xs font-medium">{s}</span>
                        ))}
                      </div>
                    )}

                    {/* Amenities */}
                    {(salon.amenities || []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {salon.amenities.map((a, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-xs text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full">
                            {amenityIcons[a] || '✓'} {a}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Team */}
                    {coiffeurs.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-primary-900 text-sm mb-3">Équipe</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {coiffeurs.map((coiffeur, idx) => {
                            const name = coiffeur.user?.name || coiffeur.name || 'Coiffeur'
                            const avatar = coiffeur.user?.picture || coiffeur.picture || coiffeur.avatar
                            return (
                              <div key={coiffeur.id || idx} className="flex items-center gap-2 bg-primary-50 rounded-xl p-2.5">
                                {avatar ? (
                                  <img src={resolveMediaUrl(avatar)} alt={name} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center text-primary-600 font-bold text-sm">
                                    {String(name).charAt(0)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium text-primary-900 text-xs truncate">{name}</p>
                                  <p className="text-[10px] text-primary-500 truncate">{coiffeur.specialty || 'Expert'}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Contact */}
                    <div>
                      <h4 className="font-semibold text-primary-900 text-sm mb-3">Contact</h4>
                      <div className="space-y-2">
                        {salon.phone && (
                          <a href={`tel:${salon.phone}`} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-900">
                            <FiPhone className="w-4 h-4" /> {salon.phone}
                          </a>
                        )}
                        {salon.email && (
                          <a href={`mailto:${salon.email}`} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-900">
                            <FiMail className="w-4 h-4" /> {salon.email}
                          </a>
                        )}
                        {(salon.whatsapp || salon.phone) && (
                          <a
                            href={`https://wa.me/${(salon.whatsapp || salon.phone).replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-green-600 font-medium"
                          >
                            WhatsApp
                          </a>
                        )}
                        {salon.coordinates && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${salon.coordinates.lat},${salon.coordinates.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-900"
                          >
                            <FiMapPin className="w-4 h-4" /> Voir sur Google Maps
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Payment Methods */}
                    {salon.paymentMethods?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-primary-900 text-sm mb-2">Paiement accepté</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {salon.paymentMethods.map((pm) => {
                            const method = pm.method || pm
                            const labels = {
                              PAYDUNYA: { label: 'PayDunya', color: 'bg-indigo-50 text-indigo-700' },
                              WAVE: { label: 'Wave', color: 'bg-blue-50 text-blue-700' },
                              ORANGE_MONEY: { label: 'Orange Money', color: 'bg-orange-50 text-orange-700' },
                              FREE_MONEY: { label: 'Free Money', color: 'bg-green-50 text-green-700' },
                              CASH: { label: 'Espèces', color: 'bg-primary-100 text-primary-700' },
                              CARD: { label: 'Carte bancaire', color: 'bg-purple-50 text-purple-700' },
                            }
                            const info = labels[method] || { label: method, color: 'bg-primary-100 text-primary-600' }
                            return (
                              <span key={method} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${info.color}`}>{info.label}</span>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Opening Hours */}
                    {Object.keys(openingHoursMap).length > 0 && (
                      <div>
                        <h4 className="font-semibold text-primary-900 text-sm mb-2 flex items-center gap-1">
                          <FiClock className="w-4 h-4" /> Horaires
                        </h4>
                        <div className="space-y-1 text-sm">
                          {Object.entries(openingHoursMap).map(([day, hours]) => (
                            <div key={day} className="flex justify-between">
                              <span className="text-primary-600">{getDayName(day)}</span>
                              <span className={hours ? 'text-primary-900 font-medium' : 'text-red-500'}>
                                {hours ? `${hours.open} - ${hours.close}` : 'Fermé'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reassurance strip */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="flex items-center gap-2 bg-primary-50 rounded-lg p-2.5">
                        <FiCheck className="w-4 h-4 text-green-600 shrink-0" />
                        <span className="text-xs text-primary-700">Paiement sécurisé</span>
                      </div>
                      <div className="flex items-center gap-2 bg-primary-50 rounded-lg p-2.5">
                        <FiBox className="w-4 h-4 text-gold-600 shrink-0" />
                        <span className="text-xs text-primary-700">Retrait disponible</span>
                      </div>
                      <div className="flex items-center gap-2 bg-primary-50 rounded-lg p-2.5">
                        <FiStar className="w-4 h-4 text-gold-500 shrink-0" />
                        <span className="text-xs text-primary-700">{hasRating ? `${ratingLabel}/5 (${reviewCount})` : 'Nouveau'}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-primary-50 rounded-lg p-2.5">
                        <FiPhone className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-xs text-primary-700">Support rapide</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar — desktop only */}
          <div className="hidden lg:block space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-5 sticky top-24 border border-primary-100">
              {isBoutique ? (
                <>
                  <p className="text-2xl font-extrabold text-primary-900 mb-1">{boutiqueProducts.length} article{boutiqueProducts.length > 1 ? 's' : ''}</p>
                  <p className="text-xs text-primary-500 mb-4">{ratingHint}</p>
                  {cartCount > 0 && (
                    <div className="mb-4 p-3 bg-gold-50 border border-gold-100 rounded-xl text-sm">
                      <div className="flex justify-between font-semibold mb-1">
                        <span>Panier ({cartCount})</span>
                        <span className="text-gold-600">{formatPrice(cartTotal)}</span>
                      </div>
                      {cart.map((c, idx) => (
                        <div key={`${c.product.id}-${c.selectedSize}-${c.selectedColor}-${idx}`} className="flex justify-between text-xs text-primary-600 py-0.5">
                          <span>{c.product.name} × {c.quantity}</span>
                          <span>{formatPrice(c.product.price * c.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => cartCount > 0 ? setShowCartModal(true) : openArticlesTab()}
                    className="w-full mb-3 rounded-xl bg-primary-900 text-white font-semibold py-3 hover:bg-primary-800 transition"
                  >
                    {cartCount > 0 ? `Commander (${formatPrice(cartTotal)})` : 'Voir les articles'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-primary-500">À partir de</p>
                  <p className="text-2xl font-extrabold text-primary-900 mb-1">{priceText}</p>
                  <p className="text-xs text-primary-500 mb-4">{services.length} service{services.length > 1 ? 's' : ''}</p>
                  <button
                    onClick={handleBookNow}
                    className="w-full mb-3 rounded-xl bg-primary-900 text-white font-semibold py-3 hover:bg-primary-800 transition"
                  >
                    Réserver maintenant
                  </button>
                </>
              )}
              {(salon.whatsapp || salon.phone) && (
                <a
                  href={`https://wa.me/${(salon.whatsapp || salon.phone).replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors text-sm"
                >
                  WhatsApp
                </a>
              )}
              <div className="mt-4 pt-4 border-t border-primary-100 space-y-2 text-sm">
                {salon.phone && (
                  <a href={`tel:${salon.phone}`} className="flex items-center gap-2 text-primary-600 hover:text-primary-900"><FiPhone className="w-4 h-4" /> {salon.phone}</a>
                )}
                {salon.email && (
                  <a href={`mailto:${salon.email}`} className="flex items-center gap-2 text-primary-600 hover:text-primary-900"><FiMail className="w-4 h-4" /> {salon.email}</a>
                )}
              </div>
              {Object.keys(openingHoursMap).length > 0 && (
                <div className="mt-4 pt-4 border-t border-primary-100">
                  <h4 className="font-medium text-primary-900 mb-2 text-sm flex items-center gap-1"><FiClock className="w-4 h-4" /> Horaires</h4>
                  <div className="space-y-1 text-sm">
                    {Object.entries(openingHoursMap).map(([day, hours]) => (
                      <div key={day} className="flex justify-between">
                        <span className="text-primary-600">{getDayName(day)}</span>
                        <span className={hours ? 'text-primary-900' : 'text-red-500'}>{hours ? `${hours.open} - ${hours.close}` : 'Fermé'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
              <div className="flex items-center justify-between px-6 py-4 border-b border-primary-100">
                <div>
                  <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide">
                    {activeService.category || 'Service'}
                  </p>
                  <h3 className="text-xl font-extrabold text-primary-900">{activeService.name}</h3>
                </div>
                <button
                  onClick={() => setActiveService(null)}
                  className="w-10 h-10 rounded-full border border-primary-200 flex items-center justify-center hover:bg-primary-50"
                >
                  <FiX className="w-5 h-5 text-primary-600" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-0">
                <div className="relative bg-primary-100">
                  {activeServiceImages.length > 0 ? (
                    <img
                      src={activeServiceImages[serviceImageIndex]}
                      alt={activeService.name}
                      className="w-full h-64 md:h-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentElement.querySelector('.svc-fallback')?.classList?.remove('hidden'); }}
                    />
                  ) : null}
                  <div className={`svc-fallback w-full h-64 md:h-full flex flex-col items-center justify-center text-primary-400 bg-primary-50 ${activeServiceImages.length > 0 ? 'hidden' : ''}`}>
                    <svg className="w-12 h-12 mb-2 text-primary-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                    <span className="text-sm">Photo non disponible</span>
                  </div>

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
                    <span className="text-2xl font-extrabold text-primary-900">
                      {formatPrice(activeService.price)}
                    </span>
                    <span className="text-sm text-primary-500">
                      {formatDuration(activeService.duration)}
                    </span>
                  </div>

                  {activeService.description && (
                    <p className="text-primary-600">{activeService.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {activeService.depositPercentage != null && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gold-50 text-gold-700">
                        Acompte {activeService.depositPercentage}%
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-600">
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
                    className="w-full rounded-xl border border-primary-200 py-2.5 text-sm font-semibold text-primary-600 hover:bg-primary-50"
                  >
                    Voir plus tard
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4"
            onClick={closeProductDetail}
            onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault() }}
          >
            {(() => {
              const product = activeProduct
              const productImages = getProductImages(product)
              const {
                variantEntries,
                resolvedSizes,
                resolvedColors,
                resolvedAvailableColors,
                usesFallbackSizes,
                usesFallbackColors,
                deliveryMeta,
              } = getResolvedVariantOptions(product, { includeFallback: true })
              const hasSizes = Array.isArray(resolvedSizes) && resolvedSizes.length > 0
              const hasColors = Array.isArray(resolvedColors) && resolvedColors.length > 0
              const selSize = variantSelections[product.id]?.size || null
              const selColor = variantSelections[product.id]?.color || null
              const sizeRequired = hasSizes && !usesFallbackSizes ? true : usesFallbackSizes
              const colorRequired = hasColors && !usesFallbackColors
              const needsVariant = sizeRequired || colorRequired
              const variantChosen = (!sizeRequired || selSize) && (!colorRequired || selColor)
              const inCartItems = getCartItemForProduct(product.id).filter((c) => c.selectedSize === selSize && c.selectedColor === selColor)
              const inCartTotal = inCartItems.reduce((s, c) => s + c.quantity, 0)

              const isSizeAvailable = (sizeValue) => {
                if (variantEntries.length === 0) return true
                return variantEntries.some((v) =>
                  v.isAvailable &&
                  v.size === sizeValue &&
                  (!selColor || !v.color || v.color === selColor)
                )
              }
              const isColorAvailable = (colorValue) => {
                if (variantEntries.length === 0) {
                  if (Array.isArray(resolvedAvailableColors) && resolvedAvailableColors.length > 0) {
                    return resolvedAvailableColors.includes(colorValue)
                  }
                  return true
                }
                return variantEntries.some((v) =>
                  v.isAvailable &&
                  v.color === colorValue &&
                  (!selSize || !v.size || v.size === selSize)
                )
              }

              return (
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 250, damping: 28 }}
                  className="w-full md:max-w-2xl bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[70vh] md:max-h-[88vh] overflow-y-auto"
                  style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', touchAction: 'pan-y' }}
                  onClick={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                  <div className="sticky top-0 z-10 bg-white border-b border-primary-100 px-4 py-3 flex items-center justify-between">
                    <h3 className="font-bold text-primary-900 truncate pr-3">{product.name}</h3>
                    <button
                      onClick={closeProductDetail}
                      className="w-9 h-9 rounded-full border border-primary-200 flex items-center justify-center hover:bg-primary-50"
                    >
                      <FiX className="w-5 h-5 text-primary-600" />
                    </button>
                  </div>

                  <div className="relative bg-primary-50">
                    {productImages.length > 0 ? (
                      <img
                        src={productImages[productImageIndex]}
                        alt={product.name}
                        draggable={false}
                        className="w-full h-72 md:h-80 object-contain p-3 select-none"
                        style={{ touchAction: 'pan-y' }}
                      />
                    ) : (
                      <div className="w-full h-72 md:h-80 flex items-center justify-center">
                        <FiBox className="w-12 h-12 text-primary-300" />
                      </div>
                    )}

                    {productImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setProductImageIndex((prev) => prev === 0 ? productImages.length - 1 : prev - 1)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow"
                        >
                          <FiChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setProductImageIndex((prev) => (prev + 1) % productImages.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow"
                        >
                          <FiChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="p-4 md:p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-2xl font-extrabold text-primary-900">{formatPrice(product.price)}</p>
                        {product.category && <p className="text-xs text-primary-500 mt-1">{product.category}</p>}
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${product.stock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {product.stock > 0 ? `${product.stock} en stock` : 'Rupture'}
                      </span>
                    </div>

                    {product.description && (
                      <p className="text-sm text-primary-600">{product.description}</p>
                    )}

                    <div className="rounded-xl border border-primary-100 bg-primary-50 px-3 py-2 text-xs text-primary-600">
                      {deliveryMeta?.isDeliverable
                        ? `Livraison disponible${deliveryMeta?.deliveryFee > 0 ? ` a partir de ${formatPrice(deliveryMeta.deliveryFee)}` : ''}`
                        : 'Retrait boutique uniquement'}
                      {deliveryMeta?.isDeliverable && Array.isArray(deliveryMeta?.deliveryZones) && deliveryMeta.deliveryZones.length > 0 ? (
                        <span className="block mt-1 text-primary-500">Zones: {deliveryMeta.deliveryZones.join(', ')}</span>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <button
                        type="button"
                        onClick={() => toggleProductLike(product.id)}
                        aria-label={isProductLiked(product.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        title={isProductLiked(product.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        className={`px-2.5 py-2 rounded-xl border transition flex items-center justify-center ${isProductLiked(product.id) ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-primary-700 border-primary-200 hover:bg-primary-50'}`}
                      >
                        <FiHeart className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => shareProduct(product)}
                        aria-label="Partager"
                        title="Partager"
                        className="px-2.5 py-2 rounded-xl border border-primary-200 bg-white text-primary-700 hover:bg-primary-50 flex items-center justify-center"
                      >
                        <FiShare2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={openProductReview}
                        aria-label="Avis"
                        title="Avis"
                        className="px-2.5 py-2 rounded-xl border border-primary-200 bg-white text-primary-700 hover:bg-primary-50 flex items-center justify-center"
                      >
                        <FiMessageSquare className="w-4 h-4" />
                      </button>
                      <a
                        href={salon?.phone ? `tel:${salon.phone}` : '#'}
                        onClick={(e) => { if (!salon?.phone) e.preventDefault() }}
                        aria-label="Appeler"
                        title="Appeler"
                        className="px-2.5 py-2 rounded-xl border border-primary-200 bg-white text-primary-700 hover:bg-primary-50 flex items-center justify-center text-center"
                      >
                        <FiPhone className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => buyNow(product, selSize, selColor)}
                        disabled={product.stock <= 0 || (needsVariant && !variantChosen)}
                        aria-label="Acheter"
                        title="Acheter"
                        className="px-2.5 py-2 rounded-xl border border-primary-900 bg-primary-900 text-white hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <FiShoppingCart className="w-4 h-4" />
                      </button>
                    </div>

                    {hasSizes && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-primary-900">
                            Taille {usesFallbackSizes ? <span className="text-primary-500 font-medium">(a choisir)</span> : null}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {resolvedSizes.map((s) => {
                            const sizeValue = String(s)
                            const available = isSizeAvailable(sizeValue)
                            return (
                              <button
                                key={sizeValue}
                                onClick={() => setVariantSelections(prev => ({ ...prev, [product.id]: { ...prev[product.id], size: prev[product.id]?.size === sizeValue ? null : sizeValue } }))}
                                disabled={!available}
                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                                  !available
                                    ? 'bg-primary-100 text-primary-400 border-primary-200 cursor-not-allowed opacity-60'
                                    : selSize === sizeValue
                                      ? 'bg-primary-900 text-white border-primary-900'
                                      : 'bg-white text-primary-700 border-primary-200 hover:border-primary-400'
                                }`}
                              >
                                {sizeValue}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {hasColors && (
                      <div>
                        <p className="text-sm font-semibold text-primary-900 mb-2">
                          Couleur {usesFallbackColors ? <span className="text-primary-500 font-medium">(optionnel)</span> : null}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {resolvedColors.map((c) => {
                            const colorValue = String(c)
                            const available = isColorAvailable(colorValue)
                            return (
                              <button
                                key={colorValue}
                                onClick={() => setVariantSelections(prev => ({ ...prev, [product.id]: { ...prev[product.id], color: prev[product.id]?.color === colorValue ? null : colorValue } }))}
                                disabled={!available}
                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                                  !available
                                    ? 'bg-primary-100 text-primary-400 border-primary-200 cursor-not-allowed opacity-60 line-through'
                                    : selColor === colorValue
                                      ? 'bg-primary-900 text-white border-primary-900'
                                      : 'bg-white text-primary-700 border-primary-200 hover:border-primary-400'
                                }`}
                              >
                                {colorValue}{!available ? ' (indispo)' : ''}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {needsVariant && !variantChosen && (
                      <p className="text-xs text-gold-700 bg-gold-50 border border-gold-100 rounded-lg px-3 py-2">
                        Choisissez les options requises avant d'ajouter au panier.
                      </p>
                    )}

                    <div className="pt-2 border-t border-primary-100">
                      {inCartTotal > 0 ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => removeFromCart(product.id, selSize, selColor)} className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center hover:bg-primary-200">
                              <FiMinus className="w-4 h-4" />
                            </button>
                            <span className="font-semibold min-w-6 text-center">{inCartTotal}</span>
                            <button onClick={() => addToCart(product, selSize, selColor)} disabled={needsVariant && !variantChosen} className="w-9 h-9 rounded-full bg-gold-100 flex items-center justify-center hover:bg-gold-200 disabled:opacity-50">
                              <FiPlus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => { setShowCartModal(true); closeProductDetail() }}
                            className="rounded-xl bg-primary-900 text-white font-semibold px-4 py-2.5 text-sm"
                          >
                            Voir panier
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product, selSize, selColor)}
                          disabled={product.stock <= 0 || (needsVariant && !variantChosen)}
                          className="w-full rounded-xl bg-gradient-to-r from-primary-900 via-primary-800 to-primary-900 text-white font-semibold py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Ajouter au panier
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky mobile CTA bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white border-t border-primary-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-3 py-2.5 safe-area-pb">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          {isBoutique ? (
            <>
              <button
                onClick={() => setShowCartModal(true)}
                className="relative flex items-center justify-center w-11 h-11 rounded-xl border border-primary-200 bg-primary-50"
                disabled={cartCount === 0}
              >
                <FiShoppingCart className="w-5 h-5 text-primary-700" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>
                )}
              </button>
              <button
                onClick={() => cartCount > 0 ? setShowCartModal(true) : openArticlesTab()}
                className="flex-1 rounded-xl bg-primary-900 text-white font-semibold py-3 text-sm hover:bg-primary-800 transition"
              >
                {cartCount > 0 ? `Commander · ${formatPrice(cartTotal)}` : 'Voir les articles'}
              </button>
            </>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary-500 truncate">à partir de</p>
                <p className="font-bold text-primary-900 text-sm">{priceText}</p>
              </div>
              <button
                onClick={handleBookNow}
                className="flex-shrink-0 rounded-xl bg-primary-900 text-white font-semibold py-3 px-6 text-sm hover:bg-primary-800 transition"
              >
                Réserver
              </button>
            </>
          )}
        </div>
      </div>

      {/* Spacer for sticky mobile bar */}
      <div className="h-16 lg:hidden" />

      {/* Cart / Order Modal (Boutique) */}
      {showCartModal && isBoutique && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowCartModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary-100">
              <h3 className="text-xl font-bold text-primary-900">Votre panier ({cartCount})</h3>
              <button onClick={() => setShowCartModal(false)} className="w-10 h-10 rounded-full border border-primary-200 flex items-center justify-center hover:bg-primary-50">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {cart.map((c, idx) => (
                <div key={`${c.product.id}-${c.selectedSize}-${c.selectedColor}-${idx}`} className="flex items-center justify-between p-3 bg-primary-50 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-primary-900">{c.product.name}</p>
                    <div className="flex gap-2 text-xs text-primary-500">
                      <span>{formatPrice(c.product.price)} × {c.quantity}</span>
                      {c.selectedSize && <span>· {c.selectedSize}</span>}
                      {c.selectedColor && <span>· {c.selectedColor}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(c.product.id, c.selectedSize, c.selectedColor)} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><FiMinus className="w-4 h-4" /></button>
                    <span className="font-bold">{c.quantity}</span>
                    <button onClick={() => addToCart(c.product, c.selectedSize, c.selectedColor)} className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center"><FiPlus className="w-4 h-4" /></button>
                    <span className="ml-2 font-semibold">{formatPrice(c.product.price * c.quantity)}</span>
                  </div>
                </div>
              ))}

              <div className="rounded-xl border border-primary-100 bg-primary-50 px-3 py-2 text-xs text-primary-600">
                {cartDeliveryConfig.canDeliverAll
                  ? `Livraison possible${cartDeliveryConfig.minDeliveryFee > 0 ? ` a partir de ${formatPrice(cartDeliveryConfig.minDeliveryFee)}` : ''}`
                  : 'Ce panier contient des articles en retrait uniquement'}
                {cartDeliveryConfig.canDeliverAll && cartDeliveryConfig.deliveryZones.length > 0 ? (
                  <span className="block mt-1 text-primary-500">Zones: {cartDeliveryConfig.deliveryZones.join(', ')}</span>
                ) : null}
              </div>

              <div className="border-t border-primary-100 pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-gold-600">{formatPrice(cartTotal)}</span>
                </div>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={cart.length === 0}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
              >
                Passer la commande ({formatPrice(cartTotal)})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalonDetail


