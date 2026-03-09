import { Link } from 'react-router-dom'
import { FiStar, FiMapPin, FiClock, FiCheck, FiCamera, FiShoppingBag } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { formatPrice } from '../../utils/helpers'
import { resolveMediaUrl } from '../../utils/media'

function SalonCard({ salon, index = 0, variant = 'featured' }) {
  const resolveMedia = resolveMediaUrl
  const getDayName = () => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return days[new Date().getDay()]
  }

  const NEUTRAL_IMAGE =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">' +
        '<defs>' +
          '<linearGradient id="g" x1="0" y1="0" x2="0.5" y2="1">' +
            '<stop offset="0%" stop-color="#0f172a"/>' +
            '<stop offset="100%" stop-color="#1e293b"/>' +
          '</linearGradient>' +
          '<linearGradient id="a" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#f59e0b" stop-opacity="0.15"/>' +
            '<stop offset="100%" stop-color="#f59e0b" stop-opacity="0.03"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<rect width="100%" height="100%" fill="url(#g)"/>' +
        '<rect width="100%" height="100%" fill="url(#a)"/>' +
        '<g transform="translate(400,250)" text-anchor="middle">' +
          '<circle r="52" fill="none" stroke="#f59e0b" stroke-width="1.5" opacity="0.4"/>' +
          '<text y="8" font-size="42" fill="#f59e0b" opacity="0.6">?</text>' +
        '</g>' +
        '<text x="400" y="340" text-anchor="middle" font-size="18" fill="#94a3b8" font-family="system-ui,sans-serif" letter-spacing="2">STYLE · FLOW</text>' +
      '</svg>'
    )

  const galleryFirst = Array.isArray(salon.gallery) && salon.gallery.length > 0
    ? (salon.gallery[0].url || salon.gallery[0].media) : ''
  const rawCover = resolveMedia(salon.coverImage || salon.image || galleryFirst)
  const coverImage = rawCover || ''
  // fallback pour le quartier
  const neighborhood = salon.neighborhood || salon.address || ''
  // fallback pour specialties
  const specialties = salon.specialties || []
  // fallback pour le prix
  const servicePrices = Array.isArray(salon.services) ? salon.services.map((s) => s?.price).filter((p) => p != null && !isNaN(p)) : []
  const computedMinPrice = servicePrices.length ? Math.min(...servicePrices) : null
  const minPrice = salon.minPrice ?? computedMinPrice
  const minPriceLabel = minPrice != null ? formatPrice(minPrice) : 'Tarifs sur place'
  const reviewCount = Number(salon.reviewCount) || 0
  const ratingValue = typeof salon.rating === 'number' ? salon.rating : parseFloat(salon.rating) || 0
  const hasRating = reviewCount > 0 && ratingValue > 0
  const ratingLabel = hasRating ? ratingValue.toFixed(1) : 'Nouveau'
  // fallback pour les horaires
  const today = new Date().getDay()
  const todayHours = Array.isArray(salon.openingHours) ? salon.openingHours.find(h => h.dayOfWeek === today) : null
  const isOpen = todayHours && !todayHours.isClosed
  const isShootingStudio = salon.type === 'shooting'
  const isBarber = salon.type === 'barber'
  const isBoutique = salon.businessType === 'BOUTIQUE'

  // Badge config for salon types
  const getSalonTypeBadge = () => {
    if (isBoutique) {
      return { icon: '???', label: 'Boutique', bg: 'bg-amber-500', text: 'text-white' }
    }
    if (isShootingStudio) {
      return { icon: '??', label: 'Studio Photo', bg: 'bg-blue-500', text: 'text-white' }
    }
    if (isBarber) {
      return { icon: '??', label: 'Barbershop', bg: 'bg-gray-800', text: 'text-white' }
    }
    switch (salon.salonType) {
      case 'coiffure':
        return { icon: '?????', label: 'Coiffure', bg: 'bg-amber-100', text: 'text-amber-800' }
      case 'beaute':
        return { icon: '??', label: 'Beauté', bg: 'bg-pink-100', text: 'text-pink-800' }
      case 'mixte':
        return { icon: '??', label: 'Coiffure & Beauté', bg: 'bg-purple-100', text: 'text-purple-800' }
      default:
        return null
    }
  }

  const typeBadge = getSalonTypeBadge()
  const isList = variant === 'list'
  const ctaLabel = isBoutique ? 'Voir les articles' : isList ? 'Voir disponibilités' : 'Réserver'
  const imageHeight = isList ? 'h-44 md:h-48' : 'h-52'
  const cardClass = isList
    ? 'bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 group hover:-translate-y-1'
    : 'bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 group hover:-translate-y-1'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={cardClass}
    >
      <Link to={`/salon/${salon.id}`}>
        {/* Image */}
        <div className={`relative ${imageHeight} overflow-hidden`}>
          {coverImage ? (
            <img
              src={coverImage}
              alt={salon.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                e.target.onerror = null
                e.target.src = NEUTRAL_IMAGE
              }}
            />
          ) : (
            <img
              src={NEUTRAL_IMAGE}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {typeBadge && (
              <span className={`${typeBadge.bg} ${typeBadge.text} text-xs font-medium px-2.5 py-1 rounded-full flex items-center shadow`}>
                <span className="mr-1">{typeBadge.icon}</span>
                {typeBadge.label}
              </span>
            )}
            {salon.featured && !isShootingStudio && (
              <span className="bg-amber-400 text-gray-900 text-xs font-bold px-2.5 py-1 rounded-full shadow">
                ? Vedette
              </span>
            )}
          </div>
          {salon.verified && (
            <div className="absolute top-3 right-3 bg-amber-500 text-white p-1.5 rounded-full shadow" title="Vérifié">
              <FiCheck className="w-3.5 h-3.5" />
            </div>
          )}
          
          {/* Rating */}
          <div className={`absolute bottom-3 right-3 flex items-center space-x-1 px-2.5 py-1 rounded-full shadow ${
            hasRating ? 'bg-white' : 'bg-amber-500 text-white'
          }`}>
            <FiStar className={`w-4 h-4 ${hasRating ? 'text-amber-400 fill-current' : 'text-white'}`} />
            <span className="font-bold text-sm">{ratingLabel}</span>
            {hasRating && reviewCount > 0 && (
              <span className="text-xs text-gray-500">({reviewCount})</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-bold text-lg text-gray-900 group-hover:text-amber-600 transition-colors mb-2">
            {salon.name}
          </h3>

          <div className="flex items-center text-gray-500 text-sm mb-2">
            <FiMapPin className="w-4 h-4 mr-1.5 text-gray-400" />
            <span>{neighborhood}{salon.city ? `, ${salon.city}` : ''}</span>
          </div>

          <div className="flex items-center text-sm mb-4">
            <FiClock className="w-4 h-4 mr-1.5 text-gray-400" />
            {todayHours ? (
              isOpen ? (
                <span className="text-green-600 font-medium">
                  Ouvert · {todayHours.openTime} - {todayHours.closeTime}
                </span>
              ) : (
                <span className="text-gray-400">Fermé aujourd'hui</span>
              )
            ) : (
              <span className="text-gray-400">Horaires non renseignés</span>
            )}
          </div>

          {/* Specialties */}
          {specialties.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {specialties.slice(0, 3).map((specialty, i) => (
                <span
                  key={i}
                  className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full"
                >
                  {specialty}
                </span>
              ))}
            </div>
          )}

          {/* Price */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">
                À partir de <span className="font-bold text-gray-900">{minPriceLabel}</span>
              </span>
              {Array.isArray(salon.services) && salon.services.length > 0 && !isBoutique && (
                <span className="block text-xs text-gray-400 mt-0.5">{salon.services.length} service{salon.services.length > 1 ? 's' : ''}</span>
              )}
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-900 text-white shadow-sm group-hover:translate-x-1 transition-transform">
              {ctaLabel} ?
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default SalonCard
