import { format, parseISO, isToday, isTomorrow, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'

// ============================================
// FORMATAGE PRIX FCFA - UTILISÉ PARTOUT
// ============================================

/**
 * Format price in FCFA (XOF) - Standard format
 * @param {number} price - The price in FCFA
 * @param {boolean} showCurrency - Show "FCFA" suffix (default: true)
 * @returns {string} Formatted price string
 */
export const formatPrice = (price, showCurrency = true) => {
  if (price == null || isNaN(price)) return showCurrency ? '0 FCFA' : '0'
  
  const formatted = new Intl.NumberFormat('fr-SN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
  
  return showCurrency ? `${formatted} FCFA` : formatted
}

/**
 * Format price with compact notation for large numbers
 * @param {number} price - The price in FCFA
 * @returns {string} Compact formatted price
 */
export const formatPriceCompact = (price) => {
  if (price == null || isNaN(price)) return '0 FCFA'
  
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}M FCFA`
  }
  if (price >= 1000) {
    return `${(price / 1000).toFixed(0)}K FCFA`
  }
  return `${price} FCFA`
}

/**
 * Format price range
 * @param {number} min - Minimum price
 * @param {number} max - Maximum price
 * @returns {string} Formatted price range
 */
export const formatPriceRange = (min, max) => {
  return `${formatPrice(min, false)} - ${formatPrice(max)}`
}

// Format duration in hours and minutes
export const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours}h`
  return `${hours}h${mins}`
}

// Format date for display
export const formatDate = (dateString) => {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
  
  if (isToday(date)) return "Aujourd'hui"
  if (isTomorrow(date)) return "Demain"
  
  return format(date, 'EEEE d MMMM', { locale: fr })
}

// Format date short
export const formatDateShort = (dateString) => {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
  return format(date, 'd MMM yyyy', { locale: fr })
}

// Get next N days for booking
export const getNextDays = (count = 14) => {
  const days = []
  for (let i = 0; i < count; i++) {
    const date = addDays(new Date(), i)
    days.push({
      date: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEE', { locale: fr }),
      dayNumber: format(date, 'd'),
      month: format(date, 'MMM', { locale: fr }),
      isToday: isToday(date),
      isTomorrow: isTomorrow(date),
      dayOfWeek: format(date, 'EEEE', { locale: fr }).toLowerCase()
    })
  }
  return days
}

// Check if salon is open on a specific day
export const isSalonOpenOnDay = (salon, dayOfWeek) => {
  const hours = salon.openingHours?.[dayOfWeek]
  return hours !== null && hours !== undefined
}

// Get salon opening hours for a day
export const getSalonHoursForDay = (salon, dayOfWeek) => {
  return salon.openingHours?.[dayOfWeek] || null
}

// Generate star rating display
export const getStarRating = (rating) => {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)
  
  return {
    full: fullStars,
    half: hasHalfStar,
    empty: emptyStars
  }
}

// Truncate text
export const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

// Generate booking reference
export const generateBookingRef = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let ref = 'FRV-'
  for (let i = 0; i < 8; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return ref
}

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate Senegalese phone number
export const isValidPhone = (phone) => {
  const phoneRegex = /^(\+221|00221)?[76][0-9]{8}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

// Format phone number
export const formatPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('221')) {
    return `+221 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10)}`
  }
  return `+221 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`
}

// Calculate distance (simplified - for demo)
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Get greeting based on time
export const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

// Debounce function
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Scroll to element
export const scrollToElement = (elementId, offset = 80) => {
  const element = document.getElementById(elementId)
  if (element) {
    const top = element.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
  }
}
