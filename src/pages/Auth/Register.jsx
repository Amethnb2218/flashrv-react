import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { GoogleLogin } from '@react-oauth/google'
import { motion } from 'framer-motion'
import { FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { isValidEmail, isValidPhone } from '../../utils/helpers'

function Register() {
  const [searchParams] = useSearchParams()
  const defaultRole = searchParams.get('role') || 'client'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: defaultRole
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})

  // Google profile completion state
  const [googleCredential, setGoogleCredential] = useState(null)

  const { register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const validate = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) newErrors.name = 'Le nom est requis'
    else if (formData.name.trim().length < 2) newErrors.name = 'Le nom doit avoir au moins 2 caractères'
    
    if (!formData.email) newErrors.email = 'L\'email est requis'
    else if (!isValidEmail(formData.email)) newErrors.email = 'Email invalide'
    
    if (!formData.phone) newErrors.phone = 'Le téléphone est requis'
    else if (!isValidPhone(formData.phone)) newErrors.phone = 'Numéro de téléphone invalide'
    
    if (!formData.password) newErrors.password = 'Le mot de passe est requis'
    else if (formData.password.length < 6) newErrors.password = 'Le mot de passe doit avoir au moins 6 caractères'
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      const user = await register(formData)
      // Suppression des logs sensibles après debug
      // console.log('DEBUG inscription classique user:', user)
      // console.log('DEBUG inscription classique user.salonId:', user.salonId)
      // console.log('DEBUG inscription classique user.salon:', user.salon)
      toast.success('Compte créé avec succès !')
      if (user.role === 'pro' || user.role === 'PRO') {
        if (!user.salonId && !user.salon) {
          navigate('/pro/onboarding')
        } else if (user.status === 'PENDING') {
          navigate('/pro/pending')
        } else {
          navigate('/pro/dashboard')
        }
      } else if (user.role === 'client' || user.role === 'CLIENT') {
        navigate('/')
      } else {
        navigate('/salons')
      }
    } catch (error) {
      toast.error(error.message || 'Erreur lors de l\'inscription')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  // Handle Google Login Success - Direct registration with Google data
  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true)
    try {
      // Convertir le rôle frontend en format backend
      const accountType = formData.role === 'pro' ? 'PRO' : 'CLIENT'
      // ...existing code...
      const user = await loginWithGoogle(credentialResponse.credential, accountType)
      // console.log('DEBUG inscription Google user:', user)
      // console.log('DEBUG inscription Google user.salonId:', user.salonId)
      // console.log('DEBUG inscription Google user.salon:', user.salon)
      toast.success(`Bienvenue, ${user.name || user.email} !`)
      // Redirection intelligente pour PRO Google : onboarding si pas de salon, sinon selon statut
      // ...existing code...
      if (user.role === 'PRO') {
        if (!user.salonId && !user.salon) {
          navigate('/pro/onboarding')
        } else if (user.status === 'PENDING') {
          navigate('/pro/pending')
        } else {
          navigate('/pro/dashboard')
        }
      } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        navigate('/admin')
      } else if (user.role === 'CLIENT' || user.role === 'client') {
        navigate('/')
      } else {
        navigate('/salons')
      }
    } catch (error) {
      console.error('Erreur Google Register:', error)
      toast.error(error.message || 'Erreur lors de l\'inscription avec Google')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Google Login Error
  const handleGoogleError = () => {
    console.error('❌ Google Register Failed')
    toast.error('Échec de l\'inscription avec Google')
  }

  return (
      <div className="min-h-screen flex">
        {/* Left side - Image */}
        <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1000"
            alt="Salon"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-800/70 to-amber-900/60" />
          {/* Decorative blobs */}
          <div className="absolute top-20 left-20 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-yellow-300/15 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="text-center text-white">
              <h2 className="text-4xl font-bold mb-4">Rejoignez Style • Flow</h2>
              <p className="text-xl text-primary-100 mb-8">
              {formData.role === 'pro' 
                ? 'Développez votre activité et gagnez en visibilité'
                : 'Réservez facilement vos rendez-vous beauté'
              }
            </p>
            <ul className="text-left text-primary-100 space-y-3 max-w-sm mx-auto">
              {formData.role === 'pro' ? (
                <>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>Gérez vos rendez-vous en ligne</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>Recevez des paiements sécurisés</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>Fidélisez votre clientèle</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>Trouvez les meilleurs salons</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>Réservez en quelques clics</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>Payez en toute sécurité</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-amber-50/30"></div>
        <div className="absolute top-0 left-0 w-80 h-80 bg-amber-100/40 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-100/50 rounded-full blur-3xl translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-orange-50/40 rounded-full blur-2xl"></div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full relative z-10"
        >
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-2 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-accent-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-2xl">F</span>
              </div>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Créer un compte</h1>
            <p className="mt-2 text-gray-600">
              Rejoignez la communauté Style • Flow
            </p>
          </div>

          {/* Role Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button
              type="button"
              onClick={() => handleChange('role', 'client')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                formData.role === 'client'
                  ? 'bg-white shadow text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Je suis client
            </button>
            <button
              type="button"
              onClick={() => handleChange('role', 'pro')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                formData.role === 'pro'
                  ? 'bg-white shadow text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Je suis pro
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Votre nom complet"
                autoComplete="off"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                placeholder="votre@email.com"
                autoComplete="off"
              />
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={`input-field ${errors.phone ? 'border-red-500' : ''}`}
                placeholder="77 123 45 67"
                autoComplete="off"
              />
              {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`input-field pr-12 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Minimum 6 caractères"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className={`input-field ${errors.confirmPassword ? 'border-red-500' : ''}`}
                placeholder="Confirmez votre mot de passe"
                autoComplete="off"
              />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
            </div>

            {/* Terms */}
            <div className="flex items-start">
              <input
                type="checkbox"
                required
                className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-600">
                J'accepte les{' '}
                <a href="#" className="text-primary-600 hover:text-primary-700">conditions d'utilisation</a>
                {' '}et la{' '}
                <a href="#" className="text-primary-600 hover:text-primary-700">politique de confidentialité</a>
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Créer mon compte</span>
                  <FiArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Ou s'inscrire avec</span>
              </div>
            </div>

            {/* Google Login Button */}
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                text="signup_with"
                shape="rectangular"
                locale="fr"
              />
            </div>
          </form>

          {/* Login link */}
          <p className="mt-8 text-center text-gray-600">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
              Se connecter
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default Register

