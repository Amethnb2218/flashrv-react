import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { GoogleLogin } from '@react-oauth/google'
import { motion } from 'framer-motion'
import { FiEye, FiEyeOff, FiArrowRight, FiCalendar, FiCheckSquare, FiScissors, FiShoppingBag, FiStar } from 'react-icons/fi'
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

  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
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
  }, [from, googleAccountType, loginWithGoogle, navigate])

  const handleGoogleError = useCallback(() => {
    toast.error('Échec de la connexion avec Google')
  }, [])

  const googleLoginButton = useMemo(() => (
    <GoogleLogin
      onSuccess={handleGoogleSuccess}
      onError={handleGoogleError}
      theme="outline"
      size="large"
      text="continue_with"
      shape="rectangular"
      locale="fr"
    />
  ), [handleGoogleError, handleGoogleSuccess])

  const sideHighlights = [
    'Réservez un salon sans appels inutiles',
    'Retrouvez aussi des boutiques et des produits',
    'Gardez un suivi plus simple de votre compte',
  ]

  const sidePreviewStats = [
    { label: 'Salons', value: 'Reservation rapide', icon: <FiScissors className="h-5 w-5" /> },
    { label: 'Boutiques', value: 'Produits et commandes', icon: <FiShoppingBag className="h-5 w-5" /> },
    { label: 'Suivi', value: 'Compte et historique', icon: <FiCalendar className="h-5 w-5" /> },
  ]

  const sideFeatureCards = [
    {
      eyebrow: 'Reservation',
      title: 'Choix, horaire, confirmation.',
      text: 'Une lecture plus claire pour trouver un salon, choisir un service et confirmer sans friction.',
      icon: <FiCalendar className="h-5 w-5" />,
    },
    {
      eyebrow: 'Boutique',
      title: 'Produits, marques, panier.',
      text: 'Le meme compte vous sert aussi a retrouver des boutiques, des articles et vos commandes.',
      icon: <FiShoppingBag className="h-5 w-5" />,
    },
  ]

  return (
    <div className="min-h-screen flex bg-[#fff7ec] dark:bg-[#1a120b]">
      {/* Left side - Form */}
      <div className="relative flex flex-1 items-start justify-center overflow-hidden px-4 pb-8 pt-10 sm:px-6 lg:px-8 lg:pt-10">
        {/* Background */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#fffdf8_0%,#fff0dd_100%)] dark:bg-[linear-gradient(180deg,#21170d_0%,#1a120b_100%)]"></div>
        <div className="absolute right-0 top-0 h-96 w-96 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#f5a133]/[0.08] blur-3xl dark:bg-[#ffcb45]/[0.08]"></div>
        <div className="absolute bottom-0 left-0 h-80 w-80 translate-y-1/2 -translate-x-1/2 rounded-full bg-[#e78514]/[0.06] blur-3xl dark:bg-[#f5a133]/[0.06]"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center space-x-2 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#9d4f0d] shadow-[0_18px_40px_-28px_rgba(157,79,13,0.28)] dark:bg-[#ffd978]">
                <span className="text-2xl font-bold text-[#fff4e3] dark:text-[#2a1808]" style={{ fontFamily: "'Poppins', sans-serif" }}>J</span>
              </div>
            </Link>
            <h1 className="text-3xl font-bold text-[#2a1808] dark:text-[#fff4e3]">Bon retour !</h1>
            <p className="mt-2 text-[#7a6148] dark:text-[#d6b081]">
              Connectez-vous pour accéder à votre compte
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identifier */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#4f3821] dark:text-[#f1d3aa]">
                Email, téléphone ou identifiant
              </label>
              <input
                type="text"
                value={formData.identifier}
                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                className={`input-field border-[#e7cfaf] bg-[#fff8ee] text-[#2a1808] placeholder:text-[#a47e51] dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:placeholder:text-[#cda675] ${errors.identifier ? 'border-red-500' : ''}`}
                placeholder="email@example.com ou 77 123 45 67"
                autoComplete="email"
              />
              {errors.identifier && <p className="mt-1 text-sm text-red-500">{errors.identifier}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#4f3821] dark:text-[#f1d3aa]">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`input-field pr-12 border-[#e7cfaf] bg-[#fff8ee] text-[#2a1808] placeholder:text-[#a47e51] dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:placeholder:text-[#cda675] ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a47e51] hover:text-[#2a1808] dark:text-[#cda675] dark:hover:text-[#fff4e3]"
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
            </div>

            {/* Forgot password */}
            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm text-[#7a6148] hover:text-[#2a1808] dark:text-[#d6b081] dark:hover:text-[#fff4e3]">
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
                <div className="w-full border-t border-[#e7cfaf] dark:border-[#7a5932]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[#fff7ec] px-4 text-[#a47e51] dark:bg-[#1a120b] dark:text-[#cda675]">Ou continuer avec</span>
              </div>
            </div>

            {/* Google */}
            <div className="flex justify-center">
              {googleLoginButton}
            </div>
          </form>

          <p className="mt-8 text-center text-[#7a6148] dark:text-[#d6b081]">
            Pas encore de compte ?{' '}
            <Link to="/register" className="font-medium text-[#9d4f0d] hover:text-[#7b3f10] dark:text-[#ffd978] dark:hover:text-[#fff4e3]">
              Créer un compte
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right side - Editorial panel */}
      <div className="relative hidden overflow-hidden border-l border-[#e7cfaf] bg-[linear-gradient(180deg,#fffdf8_0%,#fff2df_100%)] text-[#2a1808] xl:block xl:w-1/2">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(231,133,20,0.08),transparent_28%),linear-gradient(135deg,rgba(255,203,69,0.08)_0%,transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.3)_0%,transparent_100%)]" />
        <div className="absolute inset-y-0 right-16 w-px bg-[#ead7ba]" />
        <div className="absolute bottom-16 left-14 h-40 w-40 border border-[#ead7ba]" />
        <div className="absolute top-16 right-14 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(231,133,20,0.08),transparent_68%)]" />

        <div className="relative flex h-full flex-col justify-start gap-10 px-12 pb-12 pt-12 xl:px-16 xl:pb-16">
          <div className="max-w-[44rem]">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_196px] xl:items-start">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#a47e51]">
                  Espace compte
                </p>
                <h2 className="mt-4 max-w-[10ch] text-5xl font-bold leading-[0.92] tracking-[-0.05em] text-[#2a1808] xl:text-[3.45rem] 2xl:text-[3.9rem]">
                  Retrouvez salons et boutiques sans interface lourde.
                </h2>
                <p className="mt-6 max-w-xl text-[1.12rem] leading-8 text-[#7a6148]">
                  Une connexion plus nette pour réserver, suivre vos rendez-vous et accéder aussi à vos achats au même endroit.
                </p>

                <ul className="mt-8 grid gap-3 text-base text-[#4f3821]">
                  {sideHighlights.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1.5 inline-flex h-6 w-6 items-center justify-center border border-[#ead7ba] bg-[#fff8ee]">
                        <FiCheckSquare className="h-3.5 w-3.5 text-[#9d4f0d]" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border border-[#9d4f0d] bg-[#2a1808] p-4 text-[#fff4e3] shadow-[0_22px_50px_-36px_rgba(95,50,15,0.32)]">
                <div className="flex items-center justify-between border-b border-white/12 pb-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#cda675]">Aperçu</p>
                    <p className="mt-1 text-lg font-semibold">Parcours client</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center border border-white/12 bg-white/[0.04]">
                    <FiStar className="h-5 w-5" />
                  </span>
                </div>

                <div className="mt-4 grid gap-2">
                  {sidePreviewStats.map((item) => (
                    <div key={item.label} className="border border-white/10 bg-white/[0.03] px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-[#cda675]">{item.label}</p>
                        <span className="text-[#f5d7ad]">{item.icon}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-[#fff4e3]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {sideFeatureCards.map((card) => (
              <div key={card.title} className="border border-[#e7cfaf] bg-[#fff8ee] p-5 shadow-[0_18px_44px_-38px_rgba(157,79,13,0.18)]">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#a47e51]">{card.eyebrow}</p>
                  <span className="inline-flex h-10 w-10 items-center justify-center border border-[#e7cfaf] bg-[#fff0de] text-[#9d4f0d]">
                    {card.icon}
                  </span>
                </div>
                <p className="mt-4 max-w-[14ch] text-[1.55rem] font-semibold leading-[1.08] tracking-[-0.04em] text-[#2a1808]">{card.title}</p>
                <p className="mt-3 text-[15px] leading-7 text-[#7a6148]">
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
