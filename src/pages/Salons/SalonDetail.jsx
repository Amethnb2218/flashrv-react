import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  FiMapPin, FiPhone, FiMail, FiClock, FiStar, FiCheck, 
  FiWifi, FiCoffee, FiChevronLeft, FiChevronRight, FiShare2,
  FiHeart
} from 'react-icons/fi'
import { salons, servicesBySalon, coiffeursBySalon, reviews } from '../../data/salons'
import { formatPrice, formatDuration } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import { useBooking } from '../../context/BookingContext'

function SalonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { setSalon } = useBooking()

  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [activeTab, setActiveTab] = useState('services')

  const salon = salons.find(s => s.id === parseInt(id))
  const services = servicesBySalon[salon?.id] || []
  const coiffeurs = coiffeursBySalon[salon?.id] || []
  const salonReviews = reviews.filter(r => r.salonId === salon?.id)

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = []
    acc[service.category].push(service)
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
    setSalon(salon)
    if (isAuthenticated) {
      navigate(`/booking/${salon.id}`)
    } else {
      navigate('/login', { state: { from: { pathname: `/booking/${salon.id}` } } })
    }
  }

  if (!salon) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Salon non trouvé</h2>
          <Link to="/salons" className="btn-primary">Retour aux salons</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/20 pt-16 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-orange-100/20 rounded-full blur-3xl"></div>
      
      {/* Image Gallery */}
      <div className="relative z-10 h-64 md:h-96 bg-gray-900">
        <img
          src={salon.images[currentImageIndex]}
          alt={salon.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Navigation arrows */}
        {salon.images.length > 1 && (
          <>
            <button
              onClick={() => setCurrentImageIndex(prev => prev === 0 ? salon.images.length - 1 : prev - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white"
            >
              <FiChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setCurrentImageIndex(prev => (prev + 1) % salon.images.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white"
            >
              <FiChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Image dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
          {salon.images.map((_, i) => (
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
        <div className="absolute top-4 right-4 flex space-x-2">
          <button className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white">
            <FiShare2 className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white">
            <FiHeart className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10 pb-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
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
                      <span>{salon.address}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1 bg-yellow-50 px-3 py-2 rounded-xl">
                  <FiStar className="w-5 h-5 text-yellow-500 fill-current" />
                  <span className="font-bold text-lg">{salon.rating}</span>
                  <span className="text-gray-500 text-sm">({salon.reviewCount})</span>
                </div>
              </div>

              <p className="text-gray-600 mb-4">{salon.description}</p>

              {/* Specialties */}
              <div className="flex flex-wrap gap-2 mb-4">
                {salon.specialties.map((specialty, i) => (
                  <span key={i} className="bg-primary-50 text-primary-600 px-3 py-1 rounded-full text-sm">
                    {specialty}
                  </span>
                ))}
              </div>

              {/* Amenities */}
              <div className="flex flex-wrap gap-3">
                {salon.amenities.map((amenity, i) => (
                  <div key={i} className="flex items-center space-x-1 text-gray-600 text-sm">
                    <span>{amenityIcons[amenity] || '✓'}</span>
                    <span className="capitalize">{amenity}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="flex border-b">
                {['services', 'equipe', 'avis'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-4 font-medium transition-colors ${
                      activeTab === tab
                        ? 'text-primary-600 border-b-2 border-primary-600'
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
                          {categoryServices.map(service => (
                            <div
                              key={service.id}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-primary-50 transition-colors"
                            >
                              <div>
                                <h4 className="font-medium text-gray-900">{service.name}</h4>
                                <p className="text-sm text-gray-500">{formatDuration(service.duration)}</p>
                              </div>
                              <span className="font-semibold text-primary-600">{formatPrice(service.price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Team Tab */}
                {activeTab === 'equipe' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {coiffeurs.map(coiffeur => (
                      <div key={coiffeur.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl">
                          {coiffeur.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{coiffeur.name}</h4>
                          <p className="text-sm text-gray-500">{coiffeur.specialty}</p>
                          <div className="flex items-center mt-1">
                            <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm ml-1">{coiffeur.rating}</span>
                            <span className="text-gray-400 mx-2">•</span>
                            <span className="text-sm text-gray-500">{coiffeur.experience}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'avis' && (
                  <div className="space-y-4">
                    {salonReviews.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FiStar className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 mb-2">Aucun avis pour le moment</p>
                        <p className="text-sm text-gray-400">Soyez le premier à laisser un avis après votre visite !</p>
                      </div>
                    ) : (
                      salonReviews.map(review => (
                        <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold">
                              {review.userName.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900">{review.userName}</h4>
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
                                <span className="text-sm text-gray-400">{review.date}</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-600">{review.comment}</p>
                        </div>
                      ))
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
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-6 sticky top-24"
            >
              <div className="text-center mb-6">
                <span className="text-lg font-bold text-primary-600">{salon.priceRange}</span>
                <p className="text-gray-500 text-sm mt-1">
                  {salon.minPrice?.toLocaleString()} - {salon.maxPrice?.toLocaleString()} FCFA
                </p>
              </div>

              <button
                onClick={handleBookNow}
                className="w-full btn-primary mb-4"
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
                  {Object.entries(salon.openingHours).map(([day, hours]) => (
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
    </div>
  )
}

export default SalonDetail

