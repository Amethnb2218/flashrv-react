import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  FiUser, FiMail, FiPhone, FiMapPin, FiCamera, FiSave, 
  FiLock, FiBell, FiTrash2, FiCheck, FiUpload, FiX, FiLoader 
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

function Profile() {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showPhotoMenu, setShowPhotoMenu] = useState(false)
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
    push: false,
    marketing: false,
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    updateUser(formData)
    setSuccess(true)
    setLoading(false)
    
    setTimeout(() => setSuccess(false), 3000)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Les mots de passe ne correspondent pas')
      return
    }
    
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    setSuccess(true)
    setLoading(false)
    
    setTimeout(() => setSuccess(false), 3000)
  }

  // Photo upload handler
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image valide')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo')
      return
    }

    setUploadingPhoto(true)
    setShowPhotoMenu(false)

    try {
      // Simulate upload - In production, upload to API/cloud storage
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Convert to base64 for demo (in production, use uploaded URL)
      const reader = new FileReader()
      reader.onloadend = () => {
        updateUser({ avatar: reader.result })
        toast.success('Photo de profil mise à jour !')
        setUploadingPhoto(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error('Erreur lors du téléchargement')
      setUploadingPhoto(false)
    }
  }

  // Photo delete handler
  const handlePhotoDelete = async () => {
    setUploadingPhoto(true)
    setShowPhotoMenu(false)

    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Remove avatar - will show initials instead
      updateUser({ avatar: null })
      toast.success('Photo de profil supprimée')
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profil', icon: FiUser },
    { id: 'security', label: 'Sécurité', icon: FiLock },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/20 py-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-100/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
          <p className="text-gray-600 mt-1">Gérez vos informations personnelles</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              {/* Avatar with upload/delete */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  {/* Avatar image */}
                  <div className="relative">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user?.name}
                        className={`w-24 h-24 rounded-full object-cover border-4 border-primary-100 ${uploadingPhoto ? 'opacity-50' : ''}`}
                      />
                    ) : (
                      <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-3xl border-4 border-primary-100 ${uploadingPhoto ? 'opacity-50' : ''}`}>
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    
                    {/* Loading overlay */}
                    {uploadingPhoto && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FiLoader className="w-8 h-8 text-primary-600 animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {/* Photo action button */}
                  <button 
                    onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                    disabled={uploadingPhoto}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    <FiCamera className="w-4 h-4" />
                  </button>
                  
                  {/* Photo menu dropdown */}
                  {showPhotoMenu && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600"
                      >
                        <FiUpload className="w-4 h-4 mr-3" />
                        Changer la photo
                      </button>
                      <button
                        onClick={handlePhotoDelete}
                        className="w-full flex items-center px-4 py-2 text-red-600 hover:bg-red-50"
                      >
                        <FiTrash2 className="w-4 h-4 mr-3" />
                        Supprimer
                      </button>
                      <button
                        onClick={() => setShowPhotoMenu(false)}
                        className="w-full flex items-center px-4 py-2 text-gray-500 hover:bg-gray-50"
                      >
                        <FiX className="w-4 h-4 mr-3" />
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 mt-3">{user?.name}</h3>
                <p className="text-sm text-gray-500 capitalize">
                  {user?.role === 'PRO' || user?.role === 'pro' ? 'Professionnel' : 'Client'}
                </p>
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-5 h-5 mr-3" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              {/* Success Message */}
              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center text-green-700">
                  <FiCheck className="w-5 h-5 mr-2" />
                  Modifications enregistrées avec succès !
                </div>
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile}>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">
                    Informations personnelles
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FiUser className="inline w-4 h-4 mr-1" />
                        Nom complet
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FiMail className="inline w-4 h-4 mr-1" />
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FiPhone className="inline w-4 h-4 mr-1" />
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FiMapPin className="inline w-4 h-4 mr-1" />
                        Adresse
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Quartier, ville"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center"
                    >
                      <FiSave className="w-5 h-5 mr-2" />
                      {loading ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </form>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <form onSubmit={handleChangePassword}>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">
                    Changer le mot de passe
                  </h2>

                  <div className="space-y-6 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mot de passe actuel
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nouveau mot de passe
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmer le mot de passe
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="mt-8">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Modification...' : 'Modifier le mot de passe'}
                    </button>
                  </div>

                  {/* Danger Zone */}
                  <div className="mt-12 pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-bold text-red-600 mb-4">Zone dangereuse</h3>
                    <p className="text-gray-600 mb-4">
                      La suppression de votre compte est irréversible. Toutes vos données seront perdues.
                    </p>
                    <button
                      type="button"
                      className="px-6 py-3 border border-red-300 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors flex items-center"
                    >
                      <FiTrash2 className="w-5 h-5 mr-2" />
                      Supprimer mon compte
                    </button>
                  </div>
                </form>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">
                    Préférences de notification
                  </h2>

                  <div className="space-y-4">
                    {[
                      { key: 'email', label: 'Notifications par email', description: 'Recevez des confirmations et rappels par email' },
                      { key: 'sms', label: 'Notifications SMS', description: 'Recevez des rappels par SMS' },
                      { key: 'push', label: 'Notifications push', description: 'Notifications en temps réel sur votre appareil' },
                      { key: 'marketing', label: 'Offres et promotions', description: 'Recevez nos offres exclusives et nouveautés' },
                    ].map(item => (
                      <div 
                        key={item.key}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.description}</p>
                        </div>
                        <button
                          onClick={() => handleNotificationChange(item.key)}
                          className={`relative w-14 h-8 rounded-full transition-colors ${
                            notifications[item.key] ? 'bg-primary-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                              notifications[item.key] ? 'translate-x-6' : ''
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={async () => {
                        setLoading(true)
                        await new Promise(r => setTimeout(r, 1000))
                        setSuccess(true)
                        setLoading(false)
                        setTimeout(() => setSuccess(false), 3000)
                      }}
                      disabled={loading}
                      className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Enregistrement...' : 'Enregistrer les préférences'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile

