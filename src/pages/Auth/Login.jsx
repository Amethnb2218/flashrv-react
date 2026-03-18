import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { GoogleLogin } from '@react-oauth/google'
import { motion } from 'framer-motion'
import { FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { getProRedirectPath, isProUser } from '../../utils/proOnboarding'
import { ADMIN_PATH } from '../../utils/adminPath'

function Login() {
  const [googleAccountType, setGoogleAccountType] = useState('CLIENT')
  const [formData, setFormData] = useState({ identifier: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const { login, loginWithGoogle, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const rawFrom = location.state?.from?.pathname || '/'
  const normalizeRedirectPath = (path) => {
    if (!path || typeof path !== 'string') return '/'
    if (path.startsWith('/salons/')) return path.replace('/salons/', '/salon/')
    if (path === '/order/confirmation') return '/order/checkout'
    return path
  }
  const from = normalizeRedirectPath(rawFrom)

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (isProUser(user)) {
      navigate(getProRedirectPath(user) || '/pro/onboarding', { replace: true })
      return
    }
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      navigate(ADMIN_PATH, { replace: true })
      return
    }
    navigate('/dashboard', { replace: true })
  }, [isAuthenticated, user, navigate])

  const validate = () => {
    const newErrors = {}
    if (!formData.identifier.trim()) newErrors.identifier = 'Email, téléphone ou identifiant requis'
    if (!formData.password) newErrors.password = 'Le mot de passe est requis'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    try {
      const user = await login({ identifier: formData.identifier, password: formData.password })
      toast.success(`Bienvenue, ${user.name} !`)
      if (isProUser(user)) navigate(getProRedirectPath(user) || '/pro/onboarding')
      else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') navigate(ADMIN_PATH)
      else navigate(from, { replace: true })
    } catch (error) {
      toast.error(error.message || 'Identifiants incorrects')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true)
    try {
      const user = await loginWithGoogle(credentialResponse.credential, googleAccountType)
      toast.success(`Bienvenue, ${user.name || user.email} !`)
      if (isProUser(user)) navigate(getProRedirectPath(user) || '/pro/onboarding')
      else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') navigate(ADMIN_PATH)
      else navigate(from, { replace: true })
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la connexion avec Google')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleError = () => {
    toast.error('Échec de la connexion avec Google')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-gold-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-100/50 dark:bg-gold-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-100/40 dark:bg-gold-900/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full relative z-10"
        >
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-2 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-accent-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl" style={{ fontFamily: "'Poppins', sans-serif" }}>F</span>
              </div>
            </Link>
            <h1 className="text-3xl font-bold text-primary-900 dark:text-white">Bon retour !</h1>
            <p className="mt-2 text-primary-600 dark:text-gray-400">
              Connectez-vous pour accéder à votre compte
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identifier */}
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-gray-300 mb-2">
                Email, téléphone ou identifiant
              </label>
              <input
                type="text"
                value={formData.identifier}
                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                className={`input-field dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 ${errors.identifier ? 'border-red-500' : ''}`}
                placeholder="email@example.com ou 77 123 45 67"
                autoComplete="off"
              />
              {errors.identifier && <p className="mt-1 text-sm text-red-500">{errors.identifier}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-gray-300 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`input-field pr-12 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Votre mot de passe"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" className="rounded border-primary-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
                <span className="ml-2 text-sm text-primary-600 dark:text-gray-400">Se souvenir de moi</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary-600 dark:text-gray-400 hover:text-primary-700 dark:hover:text-white">
                Mot de passe oublié ?
              </Link>
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
                  <span>Se connecter</span>
                  <FiArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-primary-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-gray-900 text-primary-500 dark:text-gray-400">Ou continuer avec</span>
              </div>
            </div>

            {/* Google */}
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                locale="fr"
              />
            </div>
          </form>

          <p className="mt-8 text-center text-primary-600 dark:text-gray-400">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-primary-600 dark:text-gold-400 font-medium hover:text-primary-700 dark:hover:text-gold-300">
              Créer un compte
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000"
          alt="Salon"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900/80 to-accent-700/80" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-4">Style • Flow</h2>
            <p className="text-xl text-primary-100">La beauté à portée de clic</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
