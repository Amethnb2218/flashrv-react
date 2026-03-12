import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  FiUser, FiMail, FiPhone, FiMapPin, FiCamera, FiSave, 
  FiLock, FiBell, FiTrash2, FiCheck, FiUpload, FiX, FiLoader 
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import apiFetch from '@/api/client'
import Modal from '../../components/UI/Modal'
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  buildAccountDeletionRecord,
  formatDeletionDeadline,
  writeAccountDeletionRecord,
} from '../../utils/accountDeletion'

function Profile() {
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showPhotoMenu, setShowPhotoMenu] = useState(false)
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || user?.phone || '',
    address: user?.address || '',
  })

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || user?.phone || '',
      address: user?.address || '',
    })
  }, [user])

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
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
      }
      const data = await apiFetch('/users/update-profile', {
        method: 'PUT',
        body: payload,
      })
      const updatedUser = data?.data?.user || data?.user
      if (!updatedUser) throw new Error('Profil non retourné')
      updateUser(updatedUser)
      setFormData({
        name: updatedUser.name || '',
        email: updatedUser.email || '',
        phoneNumber: updatedUser.phoneNumber || updatedUser.phone || '',
        address: updatedUser.address || '',
      })
      setSuccess(true)
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde')
    }
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
    try {
      await apiFetch('/users/change-password', {
        method: 'PUT',
        body: passwordData,
      })
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setSuccess(true)
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la modification du mot de passe')
    }
    setLoading(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  // Photo upload handler
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image valide')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo')
      return
    }

    setUploadingPhoto(true)
    setShowPhotoMenu(false)

    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const data = await apiFetch('/users/upload-avatar', {
        method: 'POST',
        body: fd,
      })
      const url = data?.avatarUrl || data?.data?.avatarUrl
      updateUser({ picture: url, avatar: url })
      toast.success('Photo de profil mise à jour !')
    } catch (error) {
      toast.error(error.message || 'Erreur lors du téléchargement')
    }
    setUploadingPhoto(false)
  }

  // Photo delete handler
  const handlePhotoDelete = async () => {
    setUploadingPhoto(true)
    setShowPhotoMenu(false)
    try {
      await apiFetch('/users/delete-avatar', { method: 'DELETE' })
      updateUser({ picture: null, avatar: null })
      toast.success('Photo de profil supprimée')
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la suppression')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profil', icon: FiUser },
    { id: 'security', label: 'Sécurité', icon: FiLock },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
  ]

  const deletionPreview = buildAccountDeletionRecord(user, ACCOUNT_DELETION_GRACE_DAYS)
  const deletionDeadlineLabel = formatDeletionDeadline(deletionPreview)
  const deleteKeyword = 'SUPPRIMER'

  const requestAccountDeletion = async () => {
    const payload = {
      gracePeriodDays: ACCOUNT_DELETION_GRACE_DAYS,
      reason: 'USER_REQUEST',
      requestedAt: deletionPreview.requestedAt,
      scheduledDeletionAt: deletionPreview.scheduledDeletionAt,
    }

    const attempts = [
      { path: '/users/delete-account', method: 'POST' },
      { path: '/users/delete-account', method: 'DELETE' },
      { path: '/users/request-account-deletion', method: 'POST' },
      { path: '/users/account-deletion', method: 'POST' },
      { path: '/auth/delete-account', method: 'POST' },
    ]

    let lastError = null

    for (const attempt of attempts) {
      try {
        return await apiFetch(attempt.path, {
          method: attempt.method,
          body: attempt.method === 'DELETE' ? undefined : payload,
        })
      } catch (error) {
        lastError = error
        if (Number(error?.status) === 404) continue
        throw error
      }
    }

    if (Number(lastError?.status) === 404) {
      return { localOnly: true }
    }

    throw lastError || new Error('La suppression du compte est indisponible pour le moment.')
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== deleteKeyword) {
      toast.error(`Tapez ${deleteKeyword} pour confirmer.`)
      return
    }

    setDeleteAccountLoading(true)
    try {
      await requestAccountDeletion()
      writeAccountDeletionRecord(user, deletionPreview)
      setShowDeleteAccountModal(false)
      toast.success(
        deletionDeadlineLabel
          ? `Votre compte est desactive temporairement. Vous pourrez le reactiver jusqu'au ${deletionDeadlineLabel}.`
          : 'Votre compte est desactive temporairement pendant 30 jours.'
      )
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(error.message || 'Impossible de supprimer votre compte pour le moment.')
    } finally {
      setDeleteAccountLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gold-50/20 py-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-100/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-900">Mon Profil</h1>
          <p className="text-primary-600 mt-1">Gérez vos informations personnelles</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-primary-100 p-4">
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
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-xl shadow-lg border border-primary-100 py-2 z-10">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center px-4 py-2 text-primary-700 hover:bg-primary-50 hover:text-primary-600"
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
                        className="w-full flex items-center px-4 py-2 text-primary-500 hover:bg-primary-50"
                      >
                        <FiX className="w-4 h-4 mr-3" />
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-primary-900 mt-3">{user?.name}</h3>
                <p className="text-sm text-primary-500 capitalize">
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
                        : 'text-primary-600 hover:bg-primary-50'
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
              className="bg-white rounded-2xl shadow-sm border border-primary-100 p-6"
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
                  <h2 className="text-xl font-bold text-primary-900 mb-6">
                    Informations personnelles
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        <FiUser className="inline w-4 h-4 mr-1" />
                        Nom complet
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-blue-800 bg-blue-900/80 text-blue-100 placeholder:text-blue-300 rounded-xl focus:bg-blue-900/90 focus:text-blue-100 focus:border-blue-700 transition-colors duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        <FiMail className="inline w-4 h-4 mr-1" />
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-blue-800 bg-blue-900/80 text-blue-100 placeholder:text-blue-300 rounded-xl focus:bg-blue-900/90 focus:text-blue-100 focus:border-blue-700 transition-colors duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        <FiPhone className="inline w-4 h-4 mr-1" />
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-blue-800 bg-blue-900/80 text-blue-100 placeholder:text-blue-300 rounded-xl focus:bg-blue-900/90 focus:text-blue-100 focus:border-blue-700 transition-colors duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        <FiMapPin className="inline w-4 h-4 mr-1" />
                        Adresse
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Quartier, ville"
                        className="w-full px-4 py-3 border border-blue-800 bg-blue-900/80 text-blue-100 placeholder:text-blue-300 rounded-xl focus:bg-blue-900/90 focus:text-blue-100 focus:border-blue-700 transition-colors duration-200"
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
                  <h2 className="text-xl font-bold text-primary-900 mb-6">
                    Changer le mot de passe
                  </h2>

                  <div className="space-y-6 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        Mot de passe actuel
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-3 border border-blue-800 bg-blue-900/80 text-blue-100 placeholder:text-blue-300 rounded-xl focus:bg-blue-900/90 focus:text-blue-100 focus:border-blue-700 transition-colors duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        Nouveau mot de passe
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-3 border border-blue-800 bg-blue-900/80 text-blue-100 placeholder:text-blue-300 rounded-xl focus:bg-blue-900/90 focus:text-blue-100 focus:border-blue-700 transition-colors duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        Confirmer le mot de passe
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  <div className="mt-12 pt-8 border-t border-primary-200">
                    <h3 className="text-lg font-bold text-red-600 mb-4">Zone dangereuse</h3>
                    <p className="text-primary-600 mb-4">
                      Votre compte sera d'abord desactive pendant 30 jours. Si vous vous reconnectez avant la date limite, la suppression sera annulee.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirmationText('')
                        setShowDeleteAccountModal(true)
                      }}
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
                  <h2 className="text-xl font-bold text-primary-900 mb-6">
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
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-primary-50 rounded-xl gap-3"
                      >
                        <div>
                          <p className="font-medium text-primary-900">{item.label}</p>
                          <p className="text-sm text-primary-500">{item.description}</p>
                        </div>
                        <button
                          onClick={() => handleNotificationChange(item.key)}
                          className={`relative w-14 h-8 rounded-full transition-colors ${
                            notifications[item.key] ? 'bg-primary-600' : 'bg-primary-300'
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
                        try {
                          const res = await fetch('/api/users/update-notifications', {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${sessionStorage.getItem('flashrv_token')}`
                            },
                            body: JSON.stringify(notifications)
                          })
                          if (!res.ok) throw new Error('Erreur lors de la sauvegarde')
                          setSuccess(true)
                        } catch (err) {
                          toast.error('Erreur lors de la sauvegarde')
                        }
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

      <Modal
        isOpen={showDeleteAccountModal}
        onClose={() => !deleteAccountLoading && setShowDeleteAccountModal(false)}
        title="Supprimer mon compte"
      >
        <div className="p-6 space-y-5">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">Suppression temporaire sur 30 jours</p>
            <p className="mt-2 text-sm text-red-600">
              Votre compte sera desactive immediatement, puis supprime definitivement apres 30 jours.
              Vous pourrez encore le recuperer en vous reconnectant avant le <strong>{deletionDeadlineLabel || 'delai de 30 jours'}</strong>.
            </p>
          </div>

          <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-700">
            <p>Avant de confirmer :</p>
            <p className="mt-2">Votre session sera fermee juste apres la demande.</p>
            <p className="mt-1">Vos donnees resteront recuperables pendant 30 jours.</p>
            <p className="mt-1">Une simple reconnexion pendant ce delai reactivera votre compte.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Tapez <span className="font-bold">{deleteKeyword}</span> pour confirmer
            </label>
            <input
              type="text"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder={deleteKeyword}
              className="w-full px-4 py-3 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteAccountModal(false)}
              disabled={deleteAccountLoading}
              className="flex-1 px-5 py-3 rounded-xl border border-primary-200 text-primary-700 font-semibold hover:bg-primary-50 transition disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteAccountLoading || deleteConfirmationText.trim().toUpperCase() !== deleteKeyword}
              className="flex-1 px-5 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition disabled:opacity-50"
            >
              {deleteAccountLoading ? 'Suppression...' : 'Confirmer la suppression'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Profile
