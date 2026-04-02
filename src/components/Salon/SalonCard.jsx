import { Link } from 'react-router-dom'
import { FiCamera, FiCheck, FiClock, FiMapPin, FiScissors, FiShoppingBag, FiStar } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { formatPrice } from '../../utils/helpers'
import { resolveMediaUrl } from '../../utils/media'

function SalonCard({ salon, index = 0, variant = 'featured', compact = false }) {
  const galleryFirst = Array.isArray(salon.gallery) && salon.gallery.length > 0
    ? (salon.gallery[0].url || salon.gallery[0].media)
    : ''

  const coverImage = resolveMediaUrl(salon.coverImage || salon.image || galleryFirst)
  const neighborhood = salon.neighborhood || salon.address || ''
  const specialties = Array.isArray(salon.specialties) ? salon.specialties : []
  const isBoutique = salon.businessType === 'BOUTIQUE'
  const products = Array.isArray(salon.products) ? salon.products : []
  const matchedProducts = Array.isArray(salon.matchedProducts) ? salon.matchedProducts : []
  const productPrices = products
    .map((product) => product?.price)
    .filter((price) => price != null && !Number.isNaN(price))
  const servicePrices = Array.isArray(salon.services) ? salon.services.map((service) => service?.price).filter((price) => price != null && !Number.isNaN(price)) : []
  const minPrice = salon.minPrice ?? (isBoutique ? (productPrices.length ? Math.min(...productPrices) : null) : (servicePrices.length ? Math.min(...servicePrices) : null))
  const minPriceLabel = minPrice != null ? formatPrice(minPrice) : 'Tarifs sur place'
  const reviewCount = Number(salon.reviewCount) || 0
  const ratingValue = typeof salon.rating === 'number' ? salon.rating : parseFloat(salon.rating) || 0
  const hasRating = reviewCount > 0 && ratingValue > 0
  const ratingLabel = hasRating ? ratingValue.toFixed(1) : 'Nouveau'
  const today = new Date().getDay()
  const todayHours = Array.isArray(salon.openingHours) ? salon.openingHours.find((item) => item.dayOfWeek === today) : null
  const isOpen = todayHours && !todayHours.isClosed
  const isShootingStudio = salon.type === 'shooting'
  const isBarber = salon.type === 'barber'
  const isList = variant === 'list'
  const isCompactBoutique = compact && isBoutique

  const FALLBACK_IMAGE =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">' +
      '<defs>' +
      '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#7b3f10"/>' +
      '<stop offset="100%" stop-color="#f5a133"/>' +
      '</linearGradient>' +
      '</defs>' +
      '<rect width="100%" height="100%" fill="url(#bg)"/>' +
      '<text x="400" y="280" text-anchor="middle" font-size="44" fill="#fff4e3" font-family="system-ui,sans-serif" letter-spacing="10">JOLOF ERA</text>' +
      '</svg>'
    )

  const getBadge = () => {
    if (isBoutique) {
      return { icon: <FiShoppingBag className="h-3.5 w-3.5" />, label: 'Boutique' }
    }
    if (isShootingStudio) {
      return { icon: <FiCamera className="h-3.5 w-3.5" />, label: 'Studio photo' }
    }
    if (isBarber) {
      return { icon: <FiScissors className="h-3.5 w-3.5" />, label: 'Barbier' }
    }
    if (salon.salonType === 'beaute') {
      return { icon: <FiStar className="h-3.5 w-3.5" />, label: 'Beauté' }
    }
    if (salon.salonType === 'mixte') {
      return { icon: <FiStar className="h-3.5 w-3.5" />, label: 'Mixte' }
    }
    return { icon: <FiScissors className="h-3.5 w-3.5" />, label: 'Coiffure' }
  }

  const badge = getBadge()
  const cardImageHeight = isCompactBoutique ? 'h-32 sm:h-36' : isList ? 'h-56' : 'h-48 sm:h-52'
  const ctaLabel = isBoutique ? 'Ouvrir' : isList ? 'Voir les disponibilites' : 'Reserver'

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="group h-full"
    >
      <Link
        to={`/salon/${salon.id}`}
        className={`flex h-full flex-col overflow-hidden border border-[#e7cfaf] bg-[#fff8ee]/92 shadow-[0_28px_90px_-60px_rgba(157,79,13,0.16)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_36px_100px_-60px_rgba(157,79,13,0.22)] dark:border-[#7a5932] dark:bg-[#2b1b0f] ${isCompactBoutique ? 'rounded-none shadow-[0_14px_36px_-32px_rgba(157,79,13,0.16)] hover:-translate-y-0.5 hover:shadow-[0_18px_42px_-30px_rgba(157,79,13,0.2)]' : 'rounded-none'}`}
      >
        <div className={`relative overflow-hidden ${cardImageHeight}`}>
          <img
            src={coverImage || FALLBACK_IMAGE}
            alt={salon.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
            onError={(event) => {
              event.currentTarget.onerror = null
              event.currentTarget.src = FALLBACK_IMAGE
            }}
          />

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.18)_55%,rgba(0,0,0,0.62)_100%)]"></div>

          <div className={`absolute flex flex-wrap gap-2 ${isCompactBoutique ? 'left-2.5 top-2.5' : 'left-4 top-4'}`}>
            <span className={`inline-flex items-center gap-1 rounded-none bg-[#fff8ee]/92 font-semibold text-[#2a1808] shadow-sm ${isCompactBoutique ? 'px-2 py-1 text-[9px]' : 'px-3 py-1 text-[11px]'}`}>
              {badge.icon}
              {badge.label}
            </span>
            {salon.featured && (
              <span className={`rounded-none bg-[#9d4f0d] font-semibold text-[#fff4e3] shadow-sm ${isCompactBoutique ? 'px-2 py-1 text-[9px]' : 'px-3 py-1 text-[11px]'}`}>
                En vedette
              </span>
            )}
          </div>

          {salon.verified && (
            <div className={`absolute inline-flex items-center justify-center rounded-none bg-[#9d4f0d] text-[#fff4e3] shadow-sm dark:bg-[#ffd978] dark:text-[#2a1808] ${isCompactBoutique ? 'right-2.5 top-2.5 h-7 w-7' : 'right-4 top-4 h-9 w-9'}`}>
              <FiCheck className="h-4 w-4" />
            </div>
          )}

          <div className={`absolute flex items-end justify-between gap-3 ${isCompactBoutique ? 'bottom-2.5 left-2.5 right-2.5' : 'bottom-4 left-4 right-4'}`}>
            <div className="min-w-0">
              <p className={`font-semibold uppercase tracking-[0.24em] text-white/64 ${isCompactBoutique ? 'text-[9px]' : 'text-xs'}`}>
                {salon.city || 'Dakar'}
              </p>
              <h3 className={`mt-1.5 truncate font-semibold tracking-[-0.03em] text-white ${isCompactBoutique ? 'text-[15px]' : 'text-xl'}`}>
                {salon.name}
              </h3>
            </div>

            <div className={`inline-flex items-center gap-1 rounded-none font-semibold shadow-sm ${isCompactBoutique ? 'px-2 py-1 text-[10px]' : 'px-3 py-2 text-xs'} ${hasRating ? 'bg-[#fff8ee]/92 text-[#2a1808]' : 'bg-[#9d4f0d] text-[#fff4e3]'}`}>
              <FiStar className={`h-3.5 w-3.5 ${hasRating ? 'text-[#a47e51]' : 'text-[#fff4e3]'}`} />
              <span>{ratingLabel}</span>
              {hasRating && <span className="text-[#a47e51]">({reviewCount})</span>}
            </div>
          </div>
        </div>

        <div className={`${isCompactBoutique ? 'p-3' : 'p-5'} flex flex-1 flex-col`}>
          <div className={`flex items-center gap-2 text-[#7a6148] dark:text-[#d6b081] ${isCompactBoutique ? 'text-[12px]' : 'text-sm'}`}>
            <FiMapPin className="h-4 w-4 shrink-0 text-[#a47e51] dark:text-[#cda675]" />
            <span className="truncate">{neighborhood}{salon.city ? `, ${salon.city}` : ''}</span>
          </div>

          {isCompactBoutique && specialties.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {specialties.slice(0, 2).map((specialty, specialtyIndex) => (
                <span
                  key={`${salon.id}-${specialty}-${specialtyIndex}`}
                  className="rounded-none bg-[#fff0de] px-2 py-1 text-[10px] font-medium text-[#4f3821] dark:bg-[#352214] dark:text-[#f1d3aa]"
                >
                  {specialty}
                </span>
              ))}
            </div>
          )}

          {isCompactBoutique && matchedProducts.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a47e51] dark:text-[#cda675]">
                Articles trouvés
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {matchedProducts.slice(0, 2).map((product) => (
                  <span
                    key={`${salon.id}-${product.id}`}
                    className="rounded-none bg-[#fff0de] px-2 py-1 text-[10px] font-medium text-[#4f3821] dark:bg-[#352214] dark:text-[#f1d3aa]"
                  >
                    {product.name}
                  </span>
                ))}
                {matchedProducts.length > 2 && (
                  <span className="rounded-none bg-[#9d4f0d] px-2 py-1 text-[10px] font-medium text-[#fff4e3] dark:bg-[#ffd978] dark:text-[#2a1808]">
                    +{matchedProducts.length - 2}
                  </span>
                )}
              </div>
            </div>
          )}

          {!isCompactBoutique && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <FiClock className="h-4 w-4 shrink-0 text-[#a47e51] dark:text-[#cda675]" />
              {todayHours ? (
                isOpen ? (
                  <span className="font-medium text-[#2a1808] dark:text-[#fff4e3]">
                    Ouvert aujourd hui · {todayHours.openTime} - {todayHours.closeTime}
                  </span>
                ) : (
                  <span className="text-[#7a6148] dark:text-[#d6b081]">Ferme aujourd hui</span>
                )
              ) : (
                <span className="text-[#7a6148] dark:text-[#d6b081]">Horaires non renseignes</span>
              )}
            </div>
          )}

          {!isCompactBoutique && specialties.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {specialties.slice(0, 3).map((specialty, specialtyIndex) => (
                <span
                  key={`${salon.id}-${specialty}-${specialtyIndex}`}
                  className="rounded-none bg-[#fff0de] px-2.5 py-1 text-[11px] font-medium text-[#4f3821] dark:bg-[#352214] dark:text-[#f1d3aa]"
                >
                  {specialty}
                </span>
              ))}
            </div>
          )}

          <div className={`mt-auto ${isCompactBoutique ? 'pt-4' : 'pt-5'}`}>
            <div className={`flex items-end justify-between gap-3 border-t border-[#e7cfaf] dark:border-[#7a5932] ${isCompactBoutique ? 'pt-3' : 'pt-4'}`}>
              <div>
                <p className={`font-medium uppercase tracking-[0.22em] text-[#a47e51] dark:text-[#cda675] ${isCompactBoutique ? 'text-[10px]' : 'text-xs'}`}>
                  {isBoutique ? 'Premier prix' : 'A partir de'}
                </p>
                <p className={`mt-1.5 font-semibold tracking-[-0.03em] text-[#2a1808] dark:text-[#fff4e3] ${isCompactBoutique ? 'text-base' : 'text-xl'}`}>
                  {minPriceLabel}
                </p>
                {!isBoutique && Array.isArray(salon.services) && salon.services.length > 0 && (
                  <p className="mt-1 text-xs text-[#7a6148] dark:text-[#d6b081]">
                    {salon.services.length} service{salon.services.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <span className={`inline-flex items-center gap-2 rounded-none bg-[#9d4f0d] font-semibold text-[#fff4e3] transition group-hover:bg-[#7b3f10] dark:bg-[#ffd978] dark:text-[#2a1808] dark:group-hover:bg-[#f5c25a] ${isCompactBoutique ? 'px-2.5 py-1.5 text-[11px]' : 'px-4 py-3 text-sm'}`}>
                {ctaLabel}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default SalonCard
