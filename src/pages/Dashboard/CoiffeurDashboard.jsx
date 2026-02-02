import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FiCalendar, FiClock, FiUser, FiDollarSign, FiTrendingUp, 
  FiCheck, FiX, FiPhone, FiChevronLeft, FiChevronRight,
  FiScissors, FiImage, FiSettings, FiBarChart2, FiPlus,
  FiEdit2, FiTrash2, FiUpload, FiSave, FiEye, FiGrid
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { salons, servicesBySalon } from '../../data/salons'
import toast from 'react-hot-toast'

function CoiffeurDashboard() {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  
  // Onglet actif
  const [activeTab, setActiveTab] = useState('overview')
  
  // États
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [bookings, setBookings] = useState([])
  const [salon, setSalon] = useState(null)
  const [services, setServices] = useState([])
  const [salonImages, setSalonImages] = useState([])
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [salonSettings, setSalonSettings] = useState({
    name: '',
    description: '',
    phone: '',
    whatsapp: '',
    address: '',
    openingHours: {}
  })

  // Nouveau service form
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: '',
    duration: 30,
    category: 'Coiffure',
    depositPercentage: 30
  })

  // Période stats
  const [statsPeriod, setStatsPeriod] = useState('week')

  useEffect(() => {
    if (!user) return
    
    const salonId = user.salonId || 1
    const coiffeurSalon = salons.find(s => s.id === salonId)
    setSalon(coiffeurSalon)
    
    // Charger les services
    const savedServices = JSON.parse(localStorage.getItem(`flashrv_services_${salonId}`) || 'null')
    if (savedServices) {
      setServices(savedServices)
    } else {
      setServices(servicesBySalon[salonId] || [])
    }
    
    // Charger les images
    const savedImages = JSON.parse(localStorage.getItem(`flashrv_images_${salonId}`) || '[]')
    if (savedImages.length > 0) {
      setSalonImages(savedImages)
    } else if (coiffeurSalon?.images) {
      setSalonImages(coiffeurSalon.images)
    }
    
    // Charger settings
    const savedSettings = JSON.parse(localStorage.getItem(`flashrv_settings_${salonId}`) || 'null')
    if (savedSettings) {
      setSalonSettings(savedSettings)
    } else if (coiffeurSalon) {
      setSalonSettings({
        name: coiffeurSalon.name,
        description: coiffeurSalon.description,
        phone: coiffeurSalon.phone,
        whatsapp: coiffeurSalon.whatsapp,
        address: coiffeurSalon.address,
        openingHours: coiffeurSalon.openingHours
      })
    }

    // Charger les réservations
    const savedBookings = JSON.parse(localStorage.getItem('flashrv_bookings') || '[]')
    const salonBookings = savedBookings.filter(b => b.salon?.id === salonId)
    setBookings(salonBookings)
  }, [user])

  // Sauvegarder les services
  const saveServices = (newServices) => {
    setServices(newServices)
    const salonId = user?.salonId || 1
    localStorage.setItem(`flashrv_services_${salonId}`, JSON.stringify(newServices))
  }

  // Sauvegarder les images
  const saveImages = (newImages) => {
    setSalonImages(newImages)
    const salonId = user?.salonId || 1
    localStorage.setItem(`flashrv_images_${salonId}`, JSON.stringify(newImages))
  }

  // Sauvegarder les settings
  const saveSettings = () => {
    const salonId = user?.salonId || 1
    localStorage.setItem(`flashrv_settings_${salonId}`, JSON.stringify(salonSettings))
    toast.success('Paramètres sauvegardés !')
  }

  // Stats calculées
  const todayBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date).toDateString()
    return bookingDate === selectedDate.toDateString()
  }).sort((a, b) => a.time.localeCompare(b.time))

  const getStatsForPeriod = () => {
    const now = new Date()
    let startDate
    
    switch (statsPeriod) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1))
        break
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1))
        break
      default:
        startDate = new Date(now.setDate(now.getDate() - 7))
    }

    const periodBookings = bookings.filter(b => {
      const bookingDate = new Date(b.date)
      return bookingDate >= startDate && b.status !== 'cancelled'
    })

    const totalRevenue = periodBookings
      .filter(b => b.status === 'completed' || b.status === 'confirmed')
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0)

    const completedBookings = periodBookings.filter(b => b.status === 'completed').length
    const cancelledBookings = bookings.filter(b => {
      const bookingDate = new Date(b.date)
      return bookingDate >= startDate && b.status === 'cancelled'
    }).length

    // Services populaires
    const serviceCount = {}
    periodBookings.forEach(b => {
      b.services?.forEach(s => {
        serviceCount[s.name] = (serviceCount[s.name] || 0) + 1
      })
    })
    const topServices = Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    return {
      totalBookings: periodBookings.length,
      totalRevenue,
      completedBookings,
      cancelledBookings,
      averageTicket: periodBookings.length > 0 ? Math.round(totalRevenue / periodBookings.length) : 0,
      topServices
    }
  }

  const stats = getStatsForPeriod()

  // Gestion des services
  const handleAddService = () => {
    if (!newService.name || !newService.price) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    const service = {
      id: Date.now(),
      ...newService,
      price: parseInt(newService.price),
      duration: parseInt(newService.duration)
    }

    const updated = [...services, service]
    saveServices(updated)
    setNewService({
      name: '',
      description: '',
      price: '',
      duration: 30,
      category: 'Coiffure',
      depositPercentage: 30
    })
    setShowServiceModal(false)
    toast.success('Service ajouté !')
  }

  const handleUpdateService = () => {
    if (!editingService.name || !editingService.price) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    const updated = services.map(s => 
      s.id === editingService.id ? editingService : s
    )
    saveServices(updated)
    setEditingService(null)
    toast.success('Service mis à jour !')
  }

  const handleDeleteService = (serviceId) => {
    if (confirm('Supprimer ce service ?')) {
      const updated = services.filter(s => s.id !== serviceId)
      saveServices(updated)
      toast.success('Service supprimé')
    }
  }

  // Gestion des images
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const newImages = [...salonImages, event.target.result]
        saveImages(newImages)
        toast.success('Image ajoutée !')
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDeleteImage = (index) => {
    if (confirm('Supprimer cette image ?')) {
      const updated = salonImages.filter((_, i) => i !== index)
      saveImages(updated)
      toast.success('Image supprimée')
    }
  }

  // Navigation date
  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + direction)
    setSelectedDate(newDate)
  }

  const updateBookingStatus = (bookingId, status) => {
    const updatedBookings = bookings.map(b =>
      b.id === bookingId ? { ...b, status } : b
    )
    setBookings(updatedBookings)

    const allBookings = JSON.parse(localStorage.getItem('flashrv_bookings') || '[]')
    const updated = allBookings.map(b =>
      b.id === bookingId ? { ...b, status } : b
    )
    localStorage.setItem('flashrv_bookings', JSON.stringify(updated))
    toast.success(status === 'completed' ? 'RDV terminé !' : 'RDV mis à jour')
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200'
      case 'pending_payment': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200'
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-200'
      default: return 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  // Catégories de services
  const serviceCategories = ['Coiffure', 'Tresses', 'Tissages', 'Soins', 'Maquillage', 'Ongles', 'Barbe', 'Autre']

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: FiGrid },
    { id: 'appointments', label: 'Rendez-vous', icon: FiCalendar },
    { id: 'services', label: 'Services & Prix', icon: FiScissors },
    { id: 'gallery', label: 'Galerie photos', icon: FiImage },
    { id: 'stats', label: 'Statistiques', icon: FiBarChart2 },
    { id: 'settings', label: 'Paramètres', icon: FiSettings },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/20 py-8 relative overflow-hidden">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 right-10 w-[400px] h-[400px] bg-amber-200/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-[300px] h-[300px] bg-yellow-200/30 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">
              Tableau de bord
            </h1>
            <p className="text-gray-600 mt-1 truncate">{salonSettings.name || salon?.name || 'Votre Salon'}</p>
          </div>
          <Link
            to={`/salon/${salon?.id || 1}`}
            className="flex-shrink-0 inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            <FiEye className="w-4 h-4 mr-2" />
            Voir ma page publique
          </Link>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-8">
          <div className="flex overflow-x-auto scrollbar-hide gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Quick Stats */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">RDV aujourd'hui</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{todayBookings.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                      <FiCalendar className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Revenue semaine</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {stats.totalRevenue.toLocaleString()}
                        <span className="text-lg font-normal text-gray-500"> F</span>
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <FiDollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Services actifs</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{services.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FiScissors className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Photos galerie</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{salonImages.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                      <FiImage className="w-6 h-6 text-pink-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions + Upcoming */}
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {/* Today's Appointments Preview */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900">RDV du jour</h3>
                      <button
                        onClick={() => setActiveTab('appointments')}
                        className="text-sm text-amber-600 hover:underline"
                      >
                        Voir tout →
                      </button>
                    </div>
                    {todayBookings.length > 0 ? (
                      <div className="space-y-3">
                        {todayBookings.slice(0, 3).map(booking => (
                          <div key={booking.id} className={`p-4 rounded-xl border ${getStatusStyle(booking.status)}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className="text-2xl font-bold mr-4">{booking.time}</span>
                                <div>
                                  <p className="font-medium">{booking.user?.name}</p>
                                  <p className="text-sm opacity-70">
                                    {booking.services?.map(s => s.name).join(', ')}
                                  </p>
                                </div>
                              </div>
                              <span className="font-bold">{booking.totalPrice?.toLocaleString()} F</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">Aucun RDV aujourd'hui</p>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <button 
                      onClick={() => setActiveTab('services')}
                      className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left"
                    >
                      <FiScissors className="w-8 h-8 text-amber-600 mb-3" />
                      <h4 className="font-bold text-gray-900">Gérer services</h4>
                      <p className="text-sm text-gray-500">Ajouter ou modifier vos services</p>
                    </button>
                    <button 
                      onClick={() => setActiveTab('gallery')}
                      className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left"
                    >
                      <FiImage className="w-8 h-8 text-pink-600 mb-3" />
                      <h4 className="font-bold text-gray-900">Ajouter photos</h4>
                      <p className="text-sm text-gray-500">Montrez vos réalisations</p>
                    </button>
                    <button 
                      onClick={() => setActiveTab('stats')}
                      className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left"
                    >
                      <FiBarChart2 className="w-8 h-8 text-blue-600 mb-3" />
                      <h4 className="font-bold text-gray-900">Voir statistiques</h4>
                      <p className="text-sm text-gray-500">Analysez votre activité</p>
                    </button>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Send Reminders */}
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-sm p-6 text-white">
                    <h3 className="font-bold mb-2">📱 Rappels WhatsApp</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Envoyez des rappels à vos clients pour réduire les no-shows.
                    </p>
                    <button 
                      onClick={() => {
                        const upcomingToday = todayBookings.filter(b => b.status === 'confirmed')
                        if (upcomingToday.length === 0) {
                          toast.error('Aucun RDV confirmé aujourd\'hui')
                          return
                        }
                        upcomingToday.forEach(b => {
                          const phone = b.user?.phone?.replace(/[^0-9]/g, '')
                          const message = `Rappel FlashRV' 🔔 Bonjour ${b.user?.name}, n'oubliez pas votre RDV aujourd'hui à ${b.time} chez ${salonSettings.name || salon?.name}. À bientôt !`
                          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
                        })
                      }}
                      className="w-full py-2 bg-white text-gray-900 font-medium rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      Envoyer les rappels du jour
                    </button>
                  </div>

                  {/* Top Services */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">🔥 Services populaires</h3>
                    {stats.topServices.length > 0 ? (
                      <div className="space-y-3">
                        {stats.topServices.map(([name, count], i) => (
                          <div key={name} className="flex items-center justify-between">
                            <span className="text-gray-700">{i + 1}. {name}</span>
                            <span className="text-sm bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                              {count} fois
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Pas encore de données</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* APPOINTMENTS TAB */}
          {activeTab === 'appointments' && (
            <motion.div
              key="appointments"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Date Navigation */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <button
                    onClick={() => navigateDate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <FiChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900">
                      {formatDate(selectedDate)}
                    </h2>
                    <button
                      onClick={() => setSelectedDate(new Date())}
                      className="text-sm text-amber-600 hover:underline mt-1"
                    >
                      Aujourd'hui
                    </button>
                  </div>
                  <button
                    onClick={() => navigateDate(1)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <FiChevronRight className="w-6 h-6" />
                  </button>
                </div>

                {/* Bookings List */}
                <div className="p-6">
                  {todayBookings.length > 0 ? (
                    <div className="space-y-4">
                      {todayBookings.map((booking, index) => (
                        <motion.div
                          key={booking.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`border rounded-xl p-4 ${getStatusStyle(booking.status)}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start">
                              <div className="w-16 text-center">
                                <p className="text-2xl font-bold">{booking.time}</p>
                                <p className="text-sm opacity-70">{booking.totalDuration} min</p>
                              </div>
                              <div className="ml-4 border-l-2 border-current pl-4 opacity-80">
                                <h3 className="font-bold text-lg">{booking.user?.name}</h3>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {booking.services?.map(service => (
                                    <span 
                                      key={service.id}
                                      className="px-2 py-0.5 bg-white/50 rounded text-xs"
                                    >
                                      {service.name}
                                    </span>
                                  ))}
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-sm">
                                  <a 
                                    href={`tel:${booking.user?.phone}`}
                                    className="flex items-center hover:underline"
                                  >
                                    <FiPhone className="w-4 h-4 mr-1" />
                                    Appeler
                                  </a>
                                  <a 
                                    href={`https://wa.me/${booking.user?.phone?.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center hover:underline text-green-700"
                                  >
                                    💬 WhatsApp
                                  </a>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">
                                {booking.totalPrice?.toLocaleString()} F
                              </p>
                              {booking.status === 'confirmed' && (
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => updateBookingStatus(booking.id, 'completed')}
                                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                    title="Marquer comme terminé"
                                  >
                                    <FiCheck className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                    title="Annuler"
                                  >
                                    <FiX className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FiCalendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun rendez-vous</h3>
                      <p className="text-gray-500">Pas de réservation pour cette date</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* SERVICES TAB */}
          {activeTab === 'services' && (
            <motion.div
              key="services"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Mes services ({services.length})</h2>
                  <button
                    onClick={() => setShowServiceModal(true)}
                    className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    <FiPlus className="w-4 h-4 mr-2" />
                    Ajouter un service
                  </button>
                </div>

                {/* Services Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map(service => (
                    <div
                      key={service.id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                            {service.category}
                          </span>
                          <h4 className="font-bold text-gray-900 mt-2">{service.name}</h4>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingService({ ...service })}
                            className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {service.description && (
                        <p className="text-sm text-gray-500 mb-3">{service.description}</p>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center text-gray-500">
                          <FiClock className="w-4 h-4 mr-1" />
                          {service.duration} min
                        </span>
                        <span className="font-bold text-lg text-gray-900">
                          {service.price?.toLocaleString()} F
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                          Acompte: {service.depositPercentage || 30}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {services.length === 0 && (
                  <div className="text-center py-12">
                    <FiScissors className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun service</h3>
                    <p className="text-gray-500 mb-4">Ajoutez vos services pour que les clients puissent réserver</p>
                    <button
                      onClick={() => setShowServiceModal(true)}
                      className="px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800"
                    >
                      Ajouter un service
                    </button>
                  </div>
                )}
              </div>

              {/* Add Service Modal */}
              {showServiceModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Nouveau service</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom du service *
                        </label>
                        <input
                          type="text"
                          value={newService.name}
                          onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="Ex: Tresses africaines"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Catégorie
                        </label>
                        <select
                          value={newService.category}
                          onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                        >
                          {serviceCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={newService.description}
                          onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                          rows={2}
                          placeholder="Description optionnelle..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Prix (FCFA) *
                          </label>
                          <input
                            type="number"
                            value={newService.price}
                            onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                            placeholder="15000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Durée (min)
                          </label>
                          <select
                            value={newService.duration}
                            onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                          >
                            {[15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360].map(d => (
                              <option key={d} value={d}>{d} min ({d >= 60 ? `${Math.floor(d/60)}h${d%60 > 0 ? d%60 : ''}` : `${d}min`})</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Acompte requis (%)
                        </label>
                        <select
                          value={newService.depositPercentage}
                          onChange={(e) => setNewService({ ...newService, depositPercentage: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                        >
                          {[0, 10, 20, 25, 30, 40, 50].map(p => (
                            <option key={p} value={p}>{p}%</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setShowServiceModal(false)}
                        className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleAddService}
                        className="flex-1 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800"
                      >
                        Ajouter
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Edit Service Modal */}
              {editingService && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Modifier le service</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                        <input
                          type="text"
                          value={editingService.name}
                          onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                        <select
                          value={editingService.category}
                          onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                        >
                          {serviceCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={editingService.description || ''}
                          onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA) *</label>
                          <input
                            type="number"
                            value={editingService.price}
                            onChange={(e) => setEditingService({ ...editingService, price: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Durée (min)</label>
                          <select
                            value={editingService.duration}
                            onChange={(e) => setEditingService({ ...editingService, duration: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                          >
                            {[15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360].map(d => (
                              <option key={d} value={d}>{d} min</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Acompte (%)</label>
                        <select
                          value={editingService.depositPercentage || 30}
                          onChange={(e) => setEditingService({ ...editingService, depositPercentage: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                        >
                          {[0, 10, 20, 25, 30, 40, 50].map(p => (
                            <option key={p} value={p}>{p}%</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setEditingService(null)}
                        className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleUpdateService}
                        className="flex-1 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800"
                      >
                        Sauvegarder
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {/* GALLERY TAB */}
          {activeTab === 'gallery' && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Galerie photos ({salonImages.length})</h2>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    <FiUpload className="w-4 h-4 mr-2" />
                    Ajouter des photos
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                <p className="text-gray-500 text-sm mb-6">
                  Montrez vos réalisations ! Les clients adorent voir des exemples de votre travail avant de réserver.
                </p>

                {/* Images Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {salonImages.map((image, index) => (
                    <div key={index} className="relative group aspect-square rounded-xl overflow-hidden">
                      <img
                        src={image}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => handleDeleteImage(index)}
                          className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </div>
                      {index === 0 && (
                        <span className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
                          Couverture
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Upload placeholder */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center hover:border-amber-500 hover:bg-amber-50 transition-colors"
                  >
                    <FiPlus className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-500 mt-2">Ajouter</span>
                  </button>
                </div>

                {salonImages.length === 0 && (
                  <div className="text-center py-12">
                    <FiImage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune photo</h3>
                    <p className="text-gray-500 mb-4">Ajoutez des photos de vos réalisations</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STATS TAB */}
          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Period selector */}
              <div className="flex gap-2 mb-6">
                {[
                  { id: 'today', label: 'Aujourd\'hui' },
                  { id: 'week', label: 'Cette semaine' },
                  { id: 'month', label: 'Ce mois' },
                  { id: 'year', label: 'Cette année' },
                ].map(period => (
                  <button
                    key={period.id}
                    onClick={() => setStatsPeriod(period.id)}
                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                      statsPeriod === period.id
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              {/* Stats Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Chiffre d'affaires</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {stats.totalRevenue.toLocaleString()}
                        <span className="text-lg font-normal text-gray-500"> F</span>
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <FiDollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Total réservations</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalBookings}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FiCalendar className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Panier moyen</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {stats.averageTicket.toLocaleString()}
                        <span className="text-lg font-normal text-gray-500"> F</span>
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                      <FiTrendingUp className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Annulations</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats.cancelledBookings}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <FiX className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts section */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Top Services */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">🏆 Services les plus demandés</h3>
                  {stats.topServices.length > 0 ? (
                    <div className="space-y-4">
                      {stats.topServices.map(([name, count], i) => {
                        const maxCount = stats.topServices[0][1]
                        const percentage = (count / maxCount) * 100
                        return (
                          <div key={name}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-gray-700">{name}</span>
                              <span className="font-medium">{count} réservations</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Pas encore de données pour cette période</p>
                  )}
                </div>

                {/* Revenue breakdown */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">📊 Résumé de l'activité</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center mr-3">
                          <FiCheck className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">RDV terminés</span>
                      </div>
                      <span className="text-2xl font-bold text-green-600">{stats.completedBookings}</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center mr-3">
                          <FiClock className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">RDV à venir</span>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">
                        {stats.totalBookings - stats.completedBookings}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center mr-3">
                          <FiX className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">Annulations</span>
                      </div>
                      <span className="text-2xl font-bold text-red-600">{stats.cancelledBookings}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Paramètres du salon</h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom du salon
                    </label>
                    <input
                      type="text"
                      value={salonSettings.name}
                      onChange={(e) => setSalonSettings({ ...salonSettings, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={salonSettings.phone}
                      onChange={(e) => setSalonSettings({ ...salonSettings, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={salonSettings.whatsapp}
                      onChange={(e) => setSalonSettings({ ...salonSettings, whatsapp: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={salonSettings.address}
                      onChange={(e) => setSalonSettings({ ...salonSettings, address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={salonSettings.description}
                      onChange={(e) => setSalonSettings({ ...salonSettings, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <button
                    onClick={saveSettings}
                    className="flex items-center px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    <FiSave className="w-4 h-4 mr-2" />
                    Sauvegarder les modifications
                  </button>
                </div>
              </div>

              {/* Horaires d'ouverture */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Horaires d'ouverture</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Définissez vos horaires d'ouverture pour chaque jour de la semaine.
                </p>
                
                <div className="space-y-3">
                  {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day, index) => {
                    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][index]
                    const hours = salonSettings.openingHours?.[dayKey]
                    
                    return (
                      <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                        <span className="w-24 font-medium text-gray-900">{day}</span>
                        {hours ? (
                          <>
                            <input
                              type="time"
                              value={hours.open}
                              onChange={(e) => setSalonSettings({
                                ...salonSettings,
                                openingHours: {
                                  ...salonSettings.openingHours,
                                  [dayKey]: { ...hours, open: e.target.value }
                                }
                              })}
                              className="px-3 py-1 border border-gray-200 rounded-lg"
                            />
                            <span className="text-gray-500">à</span>
                            <input
                              type="time"
                              value={hours.close}
                              onChange={(e) => setSalonSettings({
                                ...salonSettings,
                                openingHours: {
                                  ...salonSettings.openingHours,
                                  [dayKey]: { ...hours, close: e.target.value }
                                }
                              })}
                              className="px-3 py-1 border border-gray-200 rounded-lg"
                            />
                            <button
                              onClick={() => setSalonSettings({
                                ...salonSettings,
                                openingHours: { ...salonSettings.openingHours, [dayKey]: null }
                              })}
                              className="text-red-500 hover:text-red-600 text-sm"
                            >
                              Marquer fermé
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-gray-400">Fermé</span>
                            <button
                              onClick={() => setSalonSettings({
                                ...salonSettings,
                                openingHours: {
                                  ...salonSettings.openingHours,
                                  [dayKey]: { open: '09:00', close: '18:00' }
                                }
                              })}
                              className="text-amber-600 hover:text-amber-700 text-sm"
                            >
                              Ajouter horaires
                            </button>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6">
                  <button
                    onClick={saveSettings}
                    className="flex items-center px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    <FiSave className="w-4 h-4 mr-2" />
                    Sauvegarder les horaires
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default CoiffeurDashboard

