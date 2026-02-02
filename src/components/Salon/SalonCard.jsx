import { Link } from 'react-router-dom'
import { FiStar, FiMapPin, FiClock, FiCheck, FiCamera } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { FALLBACK_IMAGE } from '../../data/salons'

function SalonCard({ salon, index = 0 }) {
  const getDayName = () => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return days[new Date().getDay()]
  }

  const todayHours = salon.openingHours?.[getDayName()]
  const isOpen = todayHours !== null
  const isShootingStudio = salon.type === 'shooting'
  const isBarber = salon.type === 'barber'

  // Badge config for salon types
  const getSalonTypeBadge = () => {
    if (isShootingStudio) {
      return { icon: '📷', label: 'Studio Photo', bg: 'bg-blue-500', text: 'text-white' }
    }
    if (isBarber) {
      return { icon: '💈', label: 'Barbershop', bg: 'bg-gray-800', text: 'text-white' }
    }
    switch (salon.salonType) {
      case 'coiffure':
        return { icon: '💇‍♀️', label: 'Coiffure', bg: 'bg-amber-100', text: 'text-amber-800' }
      case 'beaute':
        return { icon: '💅', label: 'Beauté', bg: 'bg-pink-100', text: 'text-pink-800' }
      case 'mixte':
        return { icon: '💄', label: 'Coiffure & Beauté', bg: 'bg-purple-100', text: 'text-purple-800' }
      default:
        return null
    }
  }

  const typeBadge = getSalonTypeBadge()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group"
    >
      <Link to={`/salon/${salon.id}`}>
        {/* Image */}
        <div className="relative h-52 overflow-hidden">
          <img
            src={salon.coverImage || FALLBACK_IMAGE}
            alt={salon.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.target.onerror = null
              e.target.src = FALLBACK_IMAGE
            }}
          />
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
                ⭐ Vedette
              </span>
            )}
          </div>
          {salon.verified && (
            <div className="absolute top-3 right-3 bg-amber-500 text-white p-1.5 rounded-full shadow" title="Vérifié">
              <FiCheck className="w-3.5 h-3.5" />
            </div>
          )}
          
          {/* Rating */}
          <div className="absolute bottom-3 right-3 flex items-center space-x-1 bg-white px-2.5 py-1 rounded-full shadow">
            <FiStar className="w-4 h-4 text-amber-400 fill-current" />
            <span className="font-bold text-gray-900 text-sm">{salon.rating}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-bold text-lg text-gray-900 group-hover:text-amber-600 transition-colors mb-2">
            {salon.name}
          </h3>

          <div className="flex items-center text-gray-500 text-sm mb-2">
            <FiMapPin className="w-4 h-4 mr-1.5 text-gray-400" />
            <span>{salon.neighborhood}, {salon.city}</span>
          </div>

          <div className="flex items-center text-sm mb-4">
            <FiClock className="w-4 h-4 mr-1.5 text-gray-400" />
            {isOpen ? (
              <span className="text-green-600 font-medium">
                Ouvert · {todayHours.open} - {todayHours.close}
              </span>
            ) : (
              <span className="text-gray-400">Fermé aujourd'hui</span>
            )}
          </div>

          {/* Specialties */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {salon.specialties?.slice(0, 3).map((specialty, i) => (
              <span
                key={i}
                className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full"
              >
                {specialty}
              </span>
            ))}
          </div>

          {/* Price */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              À partir de <span className="font-bold text-gray-900">{salon.minPrice?.toLocaleString()} F</span>
            </span>
            <span className="text-amber-600 font-medium text-sm group-hover:translate-x-1 transition-transform inline-block">
              Réserver →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default SalonCard

