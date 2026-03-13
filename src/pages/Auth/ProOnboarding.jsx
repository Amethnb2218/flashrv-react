import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiShoppingBag, FiScissors } from 'react-icons/fi'
import QuartierSelector from '../../components/UI/QuartierSelector'
import { useAuth } from '../../context/AuthContext'
import {
  clearProOnboardingDraft,
  getProRedirectPath,
  hasProSalon,
  readProOnboardingDraft,
  writeProOnboardingDraft,
} from '../../utils/proOnboarding'

const salonTypes = [
  { value: 'coiffure', label: 'Salon de coiffure' },
  { value: 'beaute', label: 'Salon de beaute' },
  { value: 'esthetique', label: 'Estheticienne' },
  { value: 'autre', label: 'Autre' },
]

const boutiqueTypes = [
  { value: 'accessoires', label: 'Accessoires' },
  { value: 'vetements', label: 'Vetements' },
  { value: 'sacs', label: 'Sacs & Maroquinerie' },
  { value: 'cosmetiques', label: 'Cosmetiques & Beaute' },
  { value: 'chaussures', label: 'Chaussures' },
  { value: 'bijoux', label: 'Bijoux & Montres' },
  { value: 'electronique', label: 'Electronique' },
  { value: 'alimentation', label: 'Alimentation' },
  { value: 'autre', label: 'Autre' },
]

const EMPTY_FORM = {
  name: '',
  type: '',
  neighborhood: '',
  address: '',
  city: '',
  phone: '',
}

function normalizeBusinessType(value) {
  const normalized = String(value || '').trim().toUpperCase()
  return normalized === 'SALON' || normalized === 'BOUTIQUE' ? normalized : null
}

function isEmptyForm(form) {
  return Object.values(form || {}).every((value) => !String(value || '').trim())
}

export default function ProOnboarding({ onComplete }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const [businessType, setBusinessType] = useState(() => normalizeBusinessType(searchParams.get('businessType')))
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showForm, setShowForm] = useState(false)
  const draftKey = useMemo(() => `${user?.id || ''}:${user?.email || ''}`, [user?.email, user?.id])

  useEffect(() => {
    setShowForm(true)
  }, [])

  useEffect(() => {
    const nextBusinessType = normalizeBusinessType(searchParams.get('businessType'))
    setBusinessType(nextBusinessType)
  }, [searchParams])

  useEffect(() => {
    if (hasProSalon(user)) {
      const nextPath = getProRedirectPath(user)
      if (nextPath && nextPath !== '/pro/onboarding') {
        navigate(nextPath, { replace: true })
      }
    }
  }, [navigate, user])

  useEffect(() => {
    if (!user) return

    const draft = readProOnboardingDraft(user)
    if (!businessType) {
      if (!draft || isEmptyForm(draft.form)) {
        setForm(EMPTY_FORM)
      }
      return
    }

    if (draft?.businessType === businessType && draft.form && typeof draft.form === 'object') {
      setForm({
        ...EMPTY_FORM,
        ...draft.form,
        type: draft.form.type || '',
      })
      return
    }

    setForm((current) => ({
      ...EMPTY_FORM,
      ...current,
      type: '',
    }))
  }, [businessType, draftKey, user])

  useEffect(() => {
    if (!user) return

    if (!businessType) {
      if (isEmptyForm(form)) {
        clearProOnboardingDraft(user)
      }
      return
    }

    writeProOnboardingDraft(user, {
      businessType,
      form,
    })
  }, [businessType, draftKey, form, user])

  const isBoutique = businessType === 'BOUTIQUE'
  const typeOptions = isBoutique ? boutiqueTypes : salonTypes

  const validate = () => {
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = isBoutique ? 'Nom de la boutique requis' : 'Nom du salon requis'
    if (!form.type) nextErrors.type = 'Type requis'
    if (!form.address.trim()) nextErrors.address = 'Adresse requise'
    if (!form.neighborhood) nextErrors.neighborhood = 'Quartier requis'
    if (!form.city.trim()) nextErrors.city = 'Ville requise'
    if (!form.phone.trim()) nextErrors.phone = 'Telephone requis'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => (current[key] ? { ...current, [key]: null } : current))
  }

  const handleSelectBusinessType = (nextBusinessType) => {
    const normalized = normalizeBusinessType(nextBusinessType)
    setErrors({})
    setSearchParams(normalized ? { businessType: normalized } : {})
    if (!normalized) {
      setForm((current) => ({
        ...current,
        type: '',
      }))
      return
    }

    setForm((current) => ({
      ...current,
      type: '',
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const apiFetch = (await import('../../api/client')).default
      const response = await apiFetch('/salons', {
        method: 'POST',
        body: {
          name: form.name,
          salonType: form.type,
          businessType,
          neighborhood: form.neighborhood,
          address: form.address,
          city: form.city,
          phone: form.phone,
          status: 'PENDING',
        },
      })

      const salon = response?.data?.salon || response?.salon || null
      clearProOnboardingDraft(user)

      if (salon?.id) {
        updateUser({
          hasSalon: true,
          salonId: salon.id,
          salon,
        })
      }

      toast.success(isBoutique ? 'Boutique enregistree, en attente de validation.' : 'Salon enregistre, en attente de validation.')
      if (onComplete) onComplete(salon)
      navigate('/pro/pending', { replace: true })
    } catch (error) {
      const existingSalon = error?.payload?.data?.salon || null
      if (existingSalon?.id) {
        clearProOnboardingDraft(user)
        updateUser({
          hasSalon: true,
          salonId: existingSalon.id,
          salon: existingSalon,
        })
        toast.error('Un espace existe deja pour ce compte. Reprise de votre dossier.')
        navigate(getProRedirectPath({ ...user, hasSalon: true, salonId: existingSalon.id, salon: existingSalon }) || '/pro/pending', { replace: true })
      } else {
        toast.error(error.message || 'Erreur lors de la creation')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!businessType) {
    return (
      <div className={`max-w-lg mx-auto py-10 px-6 bg-white rounded-2xl shadow border border-primary-200 transition-all duration-700 ${showForm ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary-900">Inscription Pro</h1>
          <p className="text-primary-500 text-sm mt-2">Quel type d'espace souhaitez-vous creer ?</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleSelectBusinessType('SALON')}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-primary-200 hover:border-primary-500 hover:bg-primary-50 transition cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition">
              <FiScissors className="text-primary-600 text-2xl" />
            </div>
            <span className="font-semibold text-primary-800 text-lg">Salon</span>
            <span className="text-xs text-primary-500 text-center">Coiffure, beaute, esthetique - Reservations & services</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectBusinessType('BOUTIQUE')}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-primary-200 hover:border-gold-500 hover:bg-gold-50 transition cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full bg-gold-100 flex items-center justify-center group-hover:bg-gold-200 transition">
              <FiShoppingBag className="text-gold-600 text-2xl" />
            </div>
            <span className="font-semibold text-primary-800 text-lg">Boutique</span>
            <span className="text-xs text-primary-500 text-center">Vente de produits - Commandes & articles</span>
          </button>
        </div>
        <div className="mt-6 text-center text-xs text-primary-400">
          Vous pourrez personnaliser votre espace apres validation.
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-md mx-auto py-10 px-6 bg-white rounded-2xl shadow border border-primary-200 transition-all duration-700 ${showForm ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary-900">
          {isBoutique ? 'Creer ma boutique' : 'Creer mon salon'}
        </h1>
        <p className="text-primary-500 text-sm mt-2">Remplissez les informations pour creer votre espace.</p>
        <button
          type="button"
          onClick={() => handleSelectBusinessType(null)}
          className="mt-2 text-xs text-primary-500 hover:underline"
        >
          Retour au choix salon / boutique
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block font-medium mb-1 text-primary-700" htmlFor="name">
            {isBoutique ? 'Nom de la boutique' : 'Nom du salon'} <span className="text-primary-500">*</span>
          </label>
          <input
            id="name"
            className="w-full px-3 py-2 rounded-lg border border-primary-300 focus:border-primary-500 outline-none transition placeholder-primary-400 text-base bg-primary-50"
            placeholder={isBoutique ? 'Ex: Fashion Store, Dakar Bags...' : 'Ex: Bosh Cut, Beauty Palace...'}
            value={form.name}
            onChange={(event) => handleChange('name', event.target.value)}
            autoComplete="off"
          />
          {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
        </div>

        <div>
          <label className="block font-medium mb-1 text-primary-700" htmlFor="type">
            {isBoutique ? 'Type de boutique' : "Type d'etablissement"} <span className="text-primary-500">*</span>
          </label>
          <select
            id="type"
            className="w-full px-3 py-2 rounded-lg border border-primary-300 focus:border-primary-500 outline-none transition text-base bg-primary-50"
            value={form.type}
            onChange={(event) => handleChange('type', event.target.value)}
          >
            <option value="">Selectionner le type</option>
            {typeOptions.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.type && <div className="text-red-500 text-xs mt-1">{errors.type}</div>}
        </div>

        <div>
          <label className="block font-medium mb-1 text-primary-700" htmlFor="address">
            Adresse <span className="text-primary-500">*</span>
          </label>
          <input
            id="address"
            className="w-full px-3 py-2 rounded-lg border border-primary-300 focus:border-primary-500 outline-none transition placeholder-primary-400 text-base bg-primary-50"
            placeholder="Rue, point de repere..."
            value={form.address}
            onChange={(event) => handleChange('address', event.target.value)}
            autoComplete="off"
          />
          {errors.address && <div className="text-red-500 text-xs mt-1">{errors.address}</div>}
        </div>

        <div>
          <label className="block font-medium mb-1 text-primary-700">
            Quartier <span className="text-primary-500">*</span>
          </label>
          <QuartierSelector
            value={form.neighborhood}
            onChange={(value) => handleChange('neighborhood', value)}
            placeholder="Selectionner votre quartier"
            variant="form"
          />
          {errors.neighborhood && <div className="text-red-500 text-xs mt-1">{errors.neighborhood}</div>}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block font-medium mb-1 text-primary-700" htmlFor="city">
              Ville <span className="text-primary-500">*</span>
            </label>
            <input
              id="city"
              className="w-full px-3 py-2 rounded-lg border border-primary-300 focus:border-primary-500 outline-none transition placeholder-primary-400 text-base bg-primary-50"
              placeholder="Ex: Dakar, Rufisque..."
              value={form.city}
              onChange={(event) => handleChange('city', event.target.value)}
              autoComplete="off"
            />
            {errors.city && <div className="text-red-500 text-xs mt-1">{errors.city}</div>}
          </div>
          <div className="flex-1">
            <label className="block font-medium mb-1 text-primary-700" htmlFor="phone">
              Telephone <span className="text-primary-500">*</span>
            </label>
            <input
              id="phone"
              className="w-full px-3 py-2 rounded-lg border border-primary-300 focus:border-primary-500 outline-none transition placeholder-primary-400 text-base bg-primary-50"
              placeholder="Numero WhatsApp ou mobile"
              value={form.phone}
              onChange={(event) => handleChange('phone', event.target.value)}
              autoComplete="off"
            />
            {errors.phone && <div className="text-red-500 text-xs mt-1">{errors.phone}</div>}
          </div>
        </div>

        <button
          type="submit"
          className={`w-full py-2 rounded-lg ${isBoutique ? 'bg-gold-600 hover:bg-gold-700' : 'bg-primary-600 hover:bg-primary-700'} text-white font-semibold text-base transition disabled:opacity-60 disabled:cursor-not-allowed`}
          disabled={loading}
        >
          {loading ? 'Enregistrement...' : isBoutique ? 'Creer ma boutique' : 'Creer mon salon'}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-primary-400">
        Vos donnees sont securisees et privees.
      </div>
    </div>
  )
}
