import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiSearch, FiMapPin, FiCalendar, FiStar, FiArrowRight, FiCheck, FiNavigation } from 'react-icons/fi'
import { salons, categories } from '../data/salons'
import SalonCard from '../components/Salon/SalonCard'
import toast from 'react-hot-toast'

function Home() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  
  const featuredSalons = salons.filter(s => s.featured).slice(0, 3)

  const stats = [
    { value: `${salons.length}+`, label: 'Salons partenaires' },
    { value: '500+', label: 'Réservations' },
    { value: '4.8', label: 'Note moyenne' }
  ]

  const steps = [
    {
      icon: <FiSearch className="w-7 h-7" />,
      title: 'Recherchez',
      description: 'Trouvez le salon idéal près de chez vous selon vos critères'
    },
    {
      icon: <FiCalendar className="w-7 h-7" />,
      title: 'Réservez',
      description: 'Choisissez vos services, la date et l\'heure qui vous conviennent'
    },
    {
      icon: <FiStar className="w-7 h-7" />,
      title: 'Profitez',
      description: 'Rendez-vous au salon et profitez de votre expérience beauté'
    }
  ]

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(`/salons?search=${encodeURIComponent(searchQuery)}`)
  }

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n\'est pas supportée par votre navigateur')
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
        switch(error.code) {
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
    <div className="overflow-hidden">
      {/* Hero Section - Design Clair & Élégant */}
      <section className="relative min-h-[calc(100vh-96px)] flex items-center bg-gradient-to-br from-gray-50 via-white to-amber-50/30 -mt-8">
        {/* Subtle decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-yellow-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Réservez votre
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600">
                  moment beauté
                </span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 max-w-xl leading-relaxed">
                Découvrez les meilleurs salons de coiffure et instituts de beauté au Sénégal. 
                Réservez en quelques clics, payez en toute sécurité.
              </p>

              {/* Search Box */}
              <form onSubmit={handleSearch} className="mt-10 bg-white rounded-2xl p-3 shadow-xl shadow-gray-200/60 border border-gray-100">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 w-5 h-5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Où ? (quartier, ville...)"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all outline-none text-gray-800 placeholder-gray-400"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center justify-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-4 px-8 rounded-xl transition-all hover:shadow-lg"
                  >
                    <FiSearch className="w-5 h-5" />
                    <span>Rechercher</span>
                  </button>
                </div>

                {/* Geolocation & Quick filters */}
                <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={handleGeolocation}
                    disabled={isLocating}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-all disabled:opacity-50"
                  >
                    {isLocating ? (
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiNavigation className="w-4 h-4 text-amber-600" />
                    )}
                    <span>{isLocating ? 'Localisation...' : 'Utiliser ma position'}</span>
                  </button>

                  <div className="flex flex-wrap gap-2 justify-center">
                    {categories.slice(0, 4).map(cat => (
                      <Link
                        key={cat.id}
                        to={`/salons?category=${cat.id}`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white text-gray-600 rounded-full text-sm hover:bg-amber-50 hover:text-amber-700 transition-all border border-gray-200 hover:border-amber-200"
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </form>

              {/* Stats */}
              <div className="mt-12 flex items-center gap-8 flex-wrap">
                {stats.map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-3xl md:text-4xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right - Hero Image */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600"
                  alt="Salon de coiffure"
                  className="rounded-3xl shadow-2xl w-full object-cover aspect-[4/3]"
                />

                {/* Rating badge */}
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg px-4 py-2 border border-gray-100"
                >
                  <div className="flex items-center space-x-1">
                    <FiStar className="w-5 h-5 text-amber-400 fill-current" />
                    <span className="font-bold text-gray-900">4.9</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4">
              Simple & Rapide
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Comment ça marche ?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center group"
              >
                <div className="w-16 h-16 bg-gray-900 group-hover:bg-amber-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 transition-colors duration-300">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Salons */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4">
                Top Sélection
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Salons en vedette
              </h2>
              <p className="mt-2 text-gray-600">Découvrez nos salons les mieux notés</p>
            </motion.div>
            <Link
              to="/salons"
              className="mt-6 md:mt-0 inline-flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-6 rounded-full transition-all group"
            >
              <span>Voir tous les salons</span>
              <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredSalons.map((salon, i) => (
              <SalonCard key={salon.id} salon={salon} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-2 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium mb-6">
              Pour les professionnels
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Vous êtes coiffeur ou gérant de salon ?
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed">
              Rejoignez FlashRV' et développez votre activité. Plus de visibilité, 
              gestion simplifiée, clients fidélisés.
            </p>
            <Link
              to="/register?role=coiffeur"
              className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold py-4 px-8 rounded-full transition-all hover:shadow-lg"
            >
              <span>Devenir partenaire</span>
              <FiArrowRight />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Feedback Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4">
              Votre avis compte
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Aidez-nous à améliorer
            </h2>
          </motion.div>

          <FeedbackWidget />
        </div>
      </section>
    </div>
  )
}

// Composant interactif de feedback
function FeedbackWidget() {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [feedbackType, setFeedbackType] = useState('rating')

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (feedbackType === 'rating' && rating === 0) {
      toast.error('Veuillez sélectionner une note')
      return
    }

    const feedbackData = {
      type: feedbackType,
      rating: feedbackType === 'rating' ? rating : null,
      message: feedback,
      timestamp: new Date().toISOString()
    }
    
    const existingFeedback = JSON.parse(localStorage.getItem('flashrv_feedback') || '[]')
    localStorage.setItem('flashrv_feedback', JSON.stringify([...existingFeedback, feedbackData]))
    
    setSubmitted(true)
    toast.success('Merci pour votre retour ! 🙏')
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100"
      >
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiCheck className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Merci beaucoup !</h3>
        <p className="text-gray-600 mb-6">
          Votre avis nous aide à améliorer FlashRV' pour tous nos utilisateurs.
        </p>
        <button
          onClick={() => {
            setSubmitted(false)
            setRating(0)
            setFeedback('')
          }}
          className="text-amber-600 font-medium hover:text-amber-700 transition-colors"
        >
          Donner un autre avis
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100"
    >
      {/* Type selector tabs */}
      <div className="flex border-b border-gray-100">
        {[
          { id: 'rating', label: '⭐ Noter FlashRV', icon: '⭐' },
          { id: 'suggestion', label: '💡 Suggestion', icon: '💡' },
          { id: 'problem', label: '🐛 Signaler un problème', icon: '🐛' }
        ].map(type => (
          <button
            key={type.id}
            onClick={() => setFeedbackType(type.id)}
            className={`flex-1 py-4 px-4 text-sm font-medium transition-all ${
              feedbackType === type.id
                ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="hidden sm:inline">{type.label}</span>
            <span className="sm:hidden text-lg">{type.icon}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8">
        {feedbackType === 'rating' && (
          <div className="text-center mb-8">
            <p className="text-gray-700 mb-4 font-medium">Comment évaluez-vous votre expérience ?</p>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none transform hover:scale-110 transition-transform"
                >
                  <FiStar
                    className={`w-10 h-10 sm:w-12 sm:h-12 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'text-amber-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="mt-3 text-sm text-gray-500">
                {rating === 5 && '🎉 Excellent ! Merci !'}
                {rating === 4 && '😊 Super ! Que peut-on améliorer ?'}
                {rating === 3 && '🤔 Correct. Dites-nous comment faire mieux.'}
                {rating === 2 && '😕 Dommage. Qu\'est-ce qui n\'a pas fonctionné ?'}
                {rating === 1 && '😞 Désolé. Expliquez-nous le problème.'}
              </p>
            )}
          </div>
        )}

        {feedbackType === 'suggestion' && (
          <div className="text-center mb-6">
            <p className="text-gray-700 font-medium">💡 Vous avez une idée pour améliorer FlashRV' ?</p>
            <p className="text-gray-500 text-sm mt-1">Nouvelle fonctionnalité, amélioration, etc.</p>
          </div>
        )}
        {feedbackType === 'problem' && (
          <div className="text-center mb-6">
            <p className="text-gray-700 font-medium">🐛 Vous avez rencontré un problème ?</p>
            <p className="text-gray-500 text-sm mt-1">Bug, erreur, dysfonctionnement</p>
          </div>
        )}

        <div className="mb-6">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={
              feedbackType === 'rating'
                ? 'Partagez votre expérience avec FlashRV\' (optionnel)...'
                : feedbackType === 'suggestion'
                ? 'Décrivez votre suggestion en détail...'
                : 'Décrivez le problème rencontré...'
            }
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-300 resize-none transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={feedbackType !== 'rating' && !feedback.trim()}
          className="w-full flex items-center justify-center space-x-2 py-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Envoyer mon avis</span>
        </button>

        <p className="mt-4 text-center text-xs text-gray-500">
          Vos retours sont anonymes et nous aident à améliorer le service.
        </p>
      </form>
    </motion.div>
  )
}

export default Home

