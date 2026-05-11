import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { motion } from 'framer-motion'
import { FiArrowRight, FiBarChart2, FiCalendar, FiCheckSquare, FiClock, FiEye, FiEyeOff, FiLayers, FiShoppingBag } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Logo from '../../components/UI/Logo'
import { useAuth } from '../../context/AuthContext'
import { isValidEmail, isValidPhone } from '../../utils/helpers'
import { getProRedirectPath, isProUser } from '../../utils/proOnboarding'
import { ADMIN_PATH } from '../../utils/adminPath'

function Register() {
  const [searchParams] = useSearchParams()
  const defaultRole = searchParams.get('role') || 'client'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: defaultRole,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const validate = () => {
    const newErrors = {}

    if (!formData.name.trim()) newErrors.name = 'Le nom est requis'
    else if (formData.name.trim().length < 2) newErrors.name = 'Le nom doit avoir au moins 2 caracteres'

    if (!formData.email) newErrors.email = "L'email est requis"
    else if (!isValidEmail(formData.email)) newErrors.email = 'Email invalide'

    if (!formData.phone) newErrors.phone = 'Le telephone est requis'
    else if (!isValidPhone(formData.phone)) newErrors.phone = 'Numero de telephone invalide'

    if (!formData.password) newErrors.password = 'Le mot de passe est requis'
    else if (formData.password.length < 8) newErrors.password = 'Le mot de passe doit avoir au moins 8 caracteres'
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.password)) newErrors.password = 'Le mot de passe doit contenir majuscule, minuscule et chiffre'

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      const user = await register(formData)
      toast.success('Compte cree avec succes !')

      if (isProUser(user)) navigate(getProRedirectPath(user) || '/pro/onboarding')
      else if (user.role === 'client' || user.role === 'CLIENT') navigate('/')
      else navigate('/salons')
    } catch (error) {
      toast.error(error.message || "Erreur lors de l'inscription")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }))
  }

  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
    setIsLoading(true)
    try {
      const accountType = formData.role === 'pro' ? 'PRO' : 'CLIENT'
      const user = await loginWithGoogle(credentialResponse.credential, accountType)
      toast.success(`Bienvenue, ${user.name || user.email} !`)

      if (isProUser(user)) navigate(getProRedirectPath(user) || '/pro/onboarding')
      else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') navigate(ADMIN_PATH)
      else if (user.role === 'CLIENT' || user.role === 'client') navigate('/')
      else navigate('/salons')
    } catch (error) {
      toast.error(error.message || "Erreur lors de l'inscription avec Google")
    } finally {
      setIsLoading(false)
    }
  }, [formData.role, loginWithGoogle, navigate])

  const handleGoogleError = useCallback(() => {
    toast.error("Echec de l'inscription avec Google")
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

  const sideTitle = formData.role === 'pro'
    ? 'Developpez votre activite sans bruit visuel.'
    : 'Reservez plus vite, sans interface surchargee.'

  const sideDescription = formData.role === 'pro'
    ? 'Un seul espace pour gerer services, catalogue, commandes, paiements et visibilite.'
    : 'Accedez a une experience plus claire pour choisir un salon, reserver et suivre vos rendez-vous.'

  const sidePoints = formData.role === 'pro'
    ? [
        'Gerez vos services et vos produits',
        'Suivez reservations, commandes et paiements',
        'Pilotez votre activite avec une presentation plus credible',
      ]
    : [
        'Trouvez rapidement un salon adapte',
        'Reservez et confirmez sans appels',
        'Gardez un suivi simple de vos rendez-vous',
      ]

  const sideFeatureCards = formData.role === 'pro'
    ? [
        {
          eyebrow: 'Reservation',
          title: 'Creneaux, rappels, validation.',
          text: 'Un socle plus net pour gerer les disponibilites, confirmer les rendez-vous et limiter les allers-retours.',
          icon: <FiCalendar className="h-5 w-5" />,
        },
        {
          eyebrow: 'Commerce',
          title: 'Catalogue, panier, commandes.',
          text: 'Vos articles, vos stocks et vos commandes dans un meme parcours, sans interface generique.',
          icon: <FiShoppingBag className="h-5 w-5" />,
        },
      ]
    : [
        {
          eyebrow: 'Selection',
          title: 'Adresses, horaires, confirmation.',
          text: 'Une lecture plus claire pour trouver, comparer et confirmer un rendez-vous en quelques gestes.',
          icon: <FiCheckSquare className="h-5 w-5" />,
        },
        {
          eyebrow: 'Suivi',
          title: 'Rappels, historique, confiance.',
          text: 'Un espace simple pour retrouver vos rendez-vous, vos confirmations et vos bonnes adresses.',
          icon: <FiClock className="h-5 w-5" />,
        },
      ]

  const sidePreviewStats = formData.role === 'pro'
    ? [
        { label: 'Services', value: 'Bloc clair' },
        { label: 'Commandes', value: 'Suivi centralise' },
        { label: 'Visibilite', value: 'Presentation nette' },
      ]
    : [
        { label: 'Salons', value: 'Choix rapide' },
        { label: 'Rendez-vous', value: 'Confirmation simple' },
        { label: 'Suivi', value: 'Historique propre' },
      ]

  const sideWorkbench = formData.role === 'pro'
    ? [
        { label: 'Tableau de bord', value: 'Services, produits, caisse et paiements dans la meme vue.' },
        { label: 'Presence boutique', value: 'Mettez en avant vos articles sans casser le parcours de reservation.' },
      ]
    : [
        { label: 'Recherche guidee', value: 'Quartier, prestation et disponibilite dans la meme interface.' },
        { label: 'Reservation fluide', value: 'Moins de friction entre la recherche, le choix et la confirmation.' },
      ]

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#fff2df_48%,#ffeacf_100%)] dark:bg-[linear-gradient(180deg,#21170d_0%,#1a120b_100%)]">
      <div className="relative hidden overflow-hidden border-r border-[#e7cfaf] bg-[linear-gradient(180deg,#fffdf8_0%,#fff2df_100%)] text-[#2a1808] dark:border-[#4d341c] dark:bg-[linear-gradient(180deg,#21170d_0%,#1a120b_100%)] dark:text-[#fff4e3] xl:block xl:w-1/2">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(231,133,20,0.08),transparent_28%),linear-gradient(135deg,rgba(255,203,69,0.08)_0%,transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.3)_0%,transparent_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,203,69,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02)_0%,transparent_100%)]" />
        <div className="absolute inset-y-0 left-16 w-px bg-[#ead7ba]"></div>
        <div className="absolute bottom-20 right-24 h-40 w-40 border border-[#ead7ba] dark:border-[#7a5932]"></div>
        <div className="absolute bottom-28 left-10 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(231,133,20,0.08),transparent_68%)] dark:bg-[radial-gradient(circle,rgba(255,203,69,0.08),transparent_68%)]" />

        <div className="relative flex h-full flex-col justify-start gap-10 px-12 pb-12 pt-8 xl:px-16 xl:pb-16 xl:pt-8">
          <div className="max-w-[44rem]">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.22fr)_196px] xl:items-start">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#a47e51] dark:text-[#cda675]">
                  {formData.role === 'pro' ? 'Espace pro' : 'Compte client'}
                </p>
                <h2 className="mt-4 max-w-[10ch] text-5xl font-bold leading-[0.92] tracking-[-0.05em] text-[#2a1808] dark:text-[#fff4e3] xl:text-[3.45rem] 2xl:text-[3.9rem]">
                  {sideTitle}
                </h2>
                <p className="mt-6 max-w-xl text-[1.12rem] leading-8 text-[#7a6148] dark:text-[#d6b081]">
                  {sideDescription}
                </p>

                <ul className="mt-8 grid gap-3 text-base text-[#4f3821] dark:text-[#f1d3aa]">
                  {sidePoints.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1.5 inline-flex h-6 w-6 items-center justify-center border border-[#ead7ba] bg-[#fff8ee] dark:border-[#7a5932] dark:bg-[#2b1b0f]">
                        <FiCheckSquare className="h-3.5 w-3.5 text-[#9d4f0d] dark:text-[#ffd978]" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border border-[#9d4f0d] bg-[#2a1808] p-4 text-[#fff4e3] shadow-[0_22px_50px_-36px_rgba(95,50,15,0.32)] dark:border-[#7a5932] dark:bg-[#2b1b0f]">
                <div className="flex items-center justify-between border-b border-white/12 pb-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#cda675]">Apercu</p>
                    <p className="mt-1 text-lg font-semibold">
                      {formData.role === 'pro' ? 'Tableau pro' : 'Parcours client'}
                    </p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center border border-white/12 bg-white/[0.04]">
                    {formData.role === 'pro' ? <FiBarChart2 className="h-5 w-5" /> : <FiLayers className="h-5 w-5" />}
                  </span>
                </div>

                <div className="mt-4 grid gap-2">
                  {sidePreviewStats.map((item) => (
                    <div key={item.label} className="border border-white/10 bg-white/[0.03] px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-[#cda675]">{item.label}</p>
                      <p className="mt-1.5 text-sm font-medium text-[#fff4e3]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 xl:grid-cols-2">
              {sideFeatureCards.map((card) => (
                <div key={card.title} className="border border-[#e7cfaf] bg-[#fff8ee] p-5 shadow-[0_18px_44px_-38px_rgba(157,79,13,0.18)] dark:border-[#7a5932] dark:bg-[#2b1b0f]">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#a47e51] dark:text-[#cda675]">{card.eyebrow}</p>
                    <span className="inline-flex h-10 w-10 items-center justify-center border border-[#e7cfaf] bg-[#fff0de] text-[#9d4f0d] dark:border-[#7a5932] dark:bg-[#352214] dark:text-[#ffd978]">
                      {card.icon}
                    </span>
                  </div>
                  <p className="mt-4 max-w-[14ch] text-[1.55rem] font-semibold leading-[1.08] tracking-[-0.04em] text-[#2a1808] dark:text-[#fff4e3]">{card.title}</p>
                  <p className="mt-3 text-[15px] leading-7 text-[#7a6148] dark:text-[#d6b081]">
                    {card.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 border border-[#e7cfaf] bg-[#fff8ee] p-5 dark:border-[#7a5932] dark:bg-[#2b1b0f] xl:grid-cols-[220px_minmax(0,1fr)]">
              <div className="border border-[#9d4f0d] bg-[#2a1808] p-4 text-[#fff4e3] dark:border-[#7a5932] dark:bg-[#352214]">
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#cda675]">Focus</p>
                <p className="mt-3 text-[1.45rem] font-semibold leading-[1.08] tracking-[-0.04em]">
                  {formData.role === 'pro' ? 'Plus de clarte, moins de bruit.' : 'Une lecture plus simple, sans surcharge.'}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {sideWorkbench.map((item) => (
                  <div key={item.label} className="border border-[#e7cfaf] bg-[#fff0de] p-4 dark:border-[#7a5932] dark:bg-[#352214]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#a47e51] dark:text-[#cda675]">{item.label}</p>
                    <p className="mt-2 text-base leading-7 text-[#4f3821] dark:text-[#f1d3aa]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 items-start justify-center overflow-hidden px-4 pb-8 pt-10 sm:px-6 lg:px-8 lg:pt-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#fffdf8_0%,#fff0dd_100%)] dark:bg-[linear-gradient(180deg,#21170d_0%,#1a120b_100%)]"></div>
        <div className="absolute inset-y-0 left-0 w-px bg-[#ead7ba] dark:bg-[#4d341c]"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="mb-8 text-center">
            <div className="mb-6 inline-flex">
              <Logo size="lg" />
            </div>
            <h1 className="text-3xl font-bold text-[#2a1808] dark:text-[#fff4e3]">Creer un compte</h1>
            <p className="mt-2 text-[#7a6148] dark:text-[#d6b081]">
              Rejoignez la communaute Jolof Era
            </p>
          </div>

          <div className="mb-8 flex rounded-none border border-[#e7cfaf] bg-[#fff0de] p-1 dark:border-[#7a5932] dark:bg-[#352214]">
            <button
              type="button"
              onClick={() => handleChange('role', 'client')}
              className={`flex-1 px-4 py-2 font-medium transition-all ${
                formData.role === 'client'
                  ? 'bg-[#fff8ee] text-[#2a1808] shadow dark:bg-[#2b1b0f] dark:text-[#fff4e3]'
                  : 'text-[#7a6148] hover:text-[#2a1808] dark:text-[#d6b081] dark:hover:text-[#fff4e3]'
              }`}
            >
              Je suis client
            </button>
            <button
              type="button"
              onClick={() => handleChange('role', 'pro')}
              className={`flex-1 px-4 py-2 font-medium transition-all ${
                formData.role === 'pro'
                  ? 'bg-[#fff8ee] text-[#2a1808] shadow dark:bg-[#2b1b0f] dark:text-[#fff4e3]'
                  : 'text-[#7a6148] hover:text-[#2a1808] dark:text-[#d6b081] dark:hover:text-[#fff4e3]'
              }`}
            >
              Je suis pro
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#4f3821] dark:text-[#f1d3aa]">Nom complet</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`input-field border-[#e7cfaf] bg-[#fff8ee] text-[#2a1808] placeholder:text-[#a47e51] dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:placeholder:text-[#cda675] ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Votre nom complet"
                autoComplete="name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#4f3821] dark:text-[#f1d3aa]">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`input-field border-[#e7cfaf] bg-[#fff8ee] text-[#2a1808] placeholder:text-[#a47e51] dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:placeholder:text-[#cda675] ${errors.email ? 'border-red-500' : ''}`}
                placeholder="votre@email.com"
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#4f3821] dark:text-[#f1d3aa]">Telephone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={`input-field border-[#e7cfaf] bg-[#fff8ee] text-[#2a1808] placeholder:text-[#a47e51] dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:placeholder:text-[#cda675] ${errors.phone ? 'border-red-500' : ''}`}
                placeholder="77 123 45 67"
                autoComplete="tel"
              />
              {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#4f3821] dark:text-[#f1d3aa]">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`input-field pr-12 border-[#e7cfaf] bg-[#fff8ee] text-[#2a1808] placeholder:text-[#a47e51] dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:placeholder:text-[#cda675] ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Minimum 8 caracteres"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a47e51] hover:text-[#2a1808] dark:text-[#cda675] dark:hover:text-[#fff4e3]"
                >
                  {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#4f3821] dark:text-[#f1d3aa]">Confirmer le mot de passe</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className={`input-field border-[#e7cfaf] bg-[#fff8ee] text-[#2a1808] placeholder:text-[#a47e51] dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:placeholder:text-[#cda675] ${errors.confirmPassword ? 'border-red-500' : ''}`}
                placeholder="Confirmez votre mot de passe"
                autoComplete="new-password"
              />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                required
                className="mt-1 border border-[#dec7a4] text-[#9d4f0d] focus:ring-[#f5a133]/20 dark:border-[#7a5932]"
              />
              <span className="ml-2 text-sm text-[#7a6148] dark:text-[#d6b081]">
                J&apos;accepte les{' '}
                <a href="#" className="font-medium text-[#9d4f0d] hover:text-[#7b3f10] dark:text-[#ffd978] dark:hover:text-[#fff4e3]">
                  conditions d&apos;utilisation
                </a>
                {' '}et la{' '}
                <a href="#" className="font-medium text-[#9d4f0d] hover:text-[#7b3f10] dark:text-[#ffd978] dark:hover:text-[#fff4e3]">
                  politique de confidentialite
                </a>
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 btn-primary"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Creer mon compte</span>
                  <FiArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e7cfaf] dark:border-[#7a5932]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[#fffdf8] px-4 text-[#a47e51] dark:bg-[#1a120b] dark:text-[#cda675]">
                  Ou s&apos;inscrire avec
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              {googleLoginButton}
            </div>
          </form>

          <p className="mt-8 text-center text-[#7a6148] dark:text-[#d6b081]">
            Deja un compte ?{' '}
            <Link to="/login" className="font-medium text-[#9d4f0d] hover:text-[#7b3f10] dark:text-[#ffd978] dark:hover:text-[#fff4e3]">
              Se connecter
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default Register
