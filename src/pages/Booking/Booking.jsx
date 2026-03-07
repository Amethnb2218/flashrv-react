import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCheck, FiChevronLeft, FiChevronRight, FiClock, FiCalendar, FiUser, FiScissors } from 'react-icons/fi'
import { useBooking } from '../../context/BookingContext'
import { useAuth } from '../../context/AuthContext'
import ServiceCard from '../../components/Booking/ServiceCard'
import DatePicker from '../../components/Booking/DatePicker'
import TimeSlot from '../../components/Booking/TimeSlot'
import BookingSummary from '../../components/Booking/BookingSummary'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import apiFetch from '@/api/client'

const steps = [
  { id: 1, title: 'Services', icon: FiScissors },
  { id: 2, title: 'Date & Heure', icon: FiCalendar },
  { id: 3, title: 'Confirmation', icon: FiCheck },
]

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function Booking() {
  const { salonId } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useBooking()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [salon, setSalon] = useState(null)

  useEffect(() => {
    let mounted = true
    const fetchSalon = async () => {
      try {
        setLoading(true)
        const res = await apiFetch(`/salons/${salonId}`)
        const data = res?.data ?? res
        const foundSalon = data?.salon ?? data
        if (!foundSalon) {
          navigate('/salons')
          return
        }
        if (!mounted) return
        setSalon(foundSalon)
        dispatch({ type: 'SET_SALON', payload: foundSalon })
      } catch (e) {
        if (mounted) navigate('/salons')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchSalon()
    return () => {
      mounted = false
    }
  }, [salonId, dispatch, navigate])

  useEffect(() => {
    if (!user) return
    const fullName = String(user.name || '').trim()
    const parts = fullName.split(/\s+/).filter(Boolean)
    const firstName = parts[0] || ''
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : ''
    dispatch({
      type: 'SET_CLIENT_DETAILS',
      payload: {
        clientFirstName: state.clientFirstName || firstName,
        clientLastName: state.clientLastName || lastName,
        clientPhone: state.clientPhone || user.phoneNumber || user.phone || '',
        clientAddress: state.clientAddress || user.address || '',
      },
    })
  }, [user])

  const canProceed = () => {
    switch (state.step) {
      case 1:
        return state.services.length > 0
      case 2:
        return state.date && state.time
      case 3:
        return true // Confirmation step (validation done on payment)
      default:
        return false
    }
  }

  const handleNext = () => {
    if (state.step === 3) {
      navigate('/payment')
    } else {
      dispatch({ type: 'NEXT_STEP' })
    }
  }

  const handleBack = () => {
    if (state.step === 1) {
      navigate(`/salon/${salonId}`)
    } else {
      dispatch({ type: 'PREV_STEP' })
    }
  }

  const closedWeekdays = useMemo(() => {
    const out = new Set()
    const openingHours = Array.isArray(salon?.openingHours) ? salon.openingHours : []
    openingHours.forEach((h) => {
      if (h?.isClosed && Number.isInteger(h?.dayOfWeek)) {
        out.add(Number(h.dayOfWeek))
      }
    })
    return out
  }, [salon?.openingHours])

  const fixedUnavailableDates = useMemo(() => {
    const out = new Set()
    const holidays = Array.isArray(salon?.holidays) ? salon.holidays : []
    holidays.forEach((h) => {
      const dateValue = typeof h === 'string' ? h : h?.date
      if (!dateValue) return
      const dt = new Date(dateValue)
      if (Number.isNaN(dt.getTime())) return
      out.add(toDateKey(dt))
    })
    return out
  }, [salon?.holidays])

  const isDateUnavailable = useCallback((dateKey) => {
    if (!dateKey) return true
    const date = new Date(`${dateKey}T00:00:00`)
    if (Number.isNaN(date.getTime())) return true

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return true

    if (closedWeekdays.has(date.getDay())) return true
    if (fixedUnavailableDates.has(dateKey)) return true

    return false
  }, [closedWeekdays, fixedUnavailableDates])

  const getNextAvailableDate = useCallback((fromDate) => {
    const base = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date()
    if (Number.isNaN(base.getTime())) return null
    base.setHours(0, 0, 0, 0)

    for (let i = 1; i <= 180; i++) {
      const candidate = new Date(base)
      candidate.setDate(candidate.getDate() + i)
      const key = toDateKey(candidate)
      if (!isDateUnavailable(key)) return key
    }

    return null
  }, [isDateUnavailable])

  if (loading) {
    return <LoadingSpinner />
  }

  if (!salon) {
    return null
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-gradient-to-br from-gray-50 via-white to-amber-50/20 py-4 sm:py-8">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
      
      <div className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Header — compact on mobile */}
        <div className="mb-4 sm:mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-2 sm:mb-4 text-sm"
          >
            <FiChevronLeft className="w-5 h-5 mr-0.5" />
            Retour
          </button>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 break-words">Réservation</h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-base">{salon.name}</p>
        </div>

        {/* Steps indicator — compact on mobile */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-1 sm:gap-0 max-w-md mx-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => {
                    if (state.step > step.id) dispatch({ type: 'SET_STEP', payload: step.id })
                  }}
                  disabled={state.step < step.id}
                  className={`flex items-center gap-1.5 sm:gap-2 transition-all ${
                    state.step > step.id ? 'cursor-pointer' : state.step < step.id ? 'cursor-default opacity-50' : ''
                  }`}
                >

                  <div
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-bold transition-all ${
                      state.step > step.id
                        ? 'bg-green-500 text-white'
                        : state.step === step.id
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {state.step > step.id ? (
                      <FiCheck className="w-4 h-4" />
                    ) : (
                      <step.icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={`hidden sm:inline text-sm font-medium whitespace-nowrap ${
                    state.step === step.id ? 'text-gray-900' : state.step > step.id ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 sm:mx-3 rounded ${
                    state.step > step.id ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          {/* Mobile step label */}
          <p className="sm:hidden text-center text-xs font-medium text-primary-600 mt-2">
            Étape {state.step} : {steps[state.step - 1]?.title}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="sync">
              <motion.div
                key={state.step}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="box-border w-full min-w-0 max-w-full overflow-x-hidden rounded-2xl bg-white p-3 shadow-sm sm:p-6"
              >
                {/* Step 1: Services */}
                {state.step === 1 && (
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                      Choisissez vos services
                    </h2>
                    <div className="grid gap-3 sm:gap-4">
                      {salon.services.map(service => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          isSelected={state.services.some(s => s.id === service.id)}
                          onToggle={() => {
                            if (state.services.some(s => s.id === service.id)) {
                              dispatch({ type: 'REMOVE_SERVICE', payload: service.id })
                            } else {
                              dispatch({ type: 'ADD_SERVICE', payload: service })
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Date & Time */}
                {state.step === 2 && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="w-full min-w-0 rounded-2xl border border-primary-100 bg-gradient-to-r from-primary-50 to-white px-3 py-3 sm:px-4">
                      <h2 className="text-base font-bold text-gray-900 sm:text-xl">Date et heure</h2>
                      <p className="mt-1 text-xs text-gray-600 sm:text-sm">Choisissez un jour puis un créneau disponible.</p>
                    </div>

                    <div className="w-full min-w-0">
                      <DatePicker
                        selectedDate={state.date}
                        onDateSelect={(date) => {
                          dispatch({ type: 'SET_DATE', payload: date })
                          dispatch({ type: 'SET_TIME', payload: null })
                        }}
                        isDateDisabled={isDateUnavailable}
                        daysToShow={120}
                      />
                    </div>

                    {state.date && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="w-full min-w-0"
                      >
                        <TimeSlot
                          selectedDate={state.date}
                          selectedTime={state.time}
                          onTimeSelect={(time) => dispatch({ type: 'SET_TIME', payload: time })}
                          duration={state.totalDuration}
                          isDateUnavailable={isDateUnavailable}
                          getNextAvailableDate={getNextAvailableDate}
                          onDateSelect={(date) => {
                            dispatch({ type: 'SET_DATE', payload: date })
                            dispatch({ type: 'SET_TIME', payload: null })
                          }}
                        />
                      </motion.div>
                    )}

                    {/* Quick selection feedback */}
                    {state.date && state.time && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3"
                      >
                        <FiCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <p className="text-xs font-medium text-green-700">
                          {new Date(state.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {state.time}
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Step 3: Confirmation */}
                {state.step === 3 && (
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                      Confirmer votre réservation
                    </h2>

                    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Vos informations de contact</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Ces informations seront visibles par le salon pour confirmer le rendez-vous.
                      </p>
                    <div className="grid md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={state.clientFirstName || ''}
                          onChange={(e) => dispatch({ type: 'SET_CLIENT_DETAILS', payload: { clientFirstName: e.target.value } })}
                          placeholder="Prénom *"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          value={state.clientLastName || ''}
                          onChange={(e) => dispatch({ type: 'SET_CLIENT_DETAILS', payload: { clientLastName: e.target.value } })}
                          placeholder="Nom *"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <input
                          type="tel"
                          value={state.clientPhone || ''}
                          onChange={(e) => dispatch({ type: 'SET_CLIENT_DETAILS', payload: { clientPhone: e.target.value } })}
                          placeholder="Téléphone *"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          value={state.clientAddress || ''}
                          onChange={(e) => dispatch({ type: 'SET_CLIENT_DETAILS', payload: { clientAddress: e.target.value } })}
                          placeholder="Adresse (optionnel)"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    {/* Info: Coiffeur sera assigné */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                      <div className="flex items-start">
                        <FiUser className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-blue-900">Coiffeur(se) assigné(e) par le salon</p>
                          <p className="text-blue-700 text-sm mt-1">
                            Le gérant du salon vous assignera un(e) coiffeur(se) et vous enverra une confirmation avec les détails.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Summary */}
                      <div className="bg-primary-50 rounded-xl p-4 sm:p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Récapitulatif</h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-start">
                            <FiScissors className="w-5 h-5 text-primary-600 mt-0.5 mr-3" />
                            <div>
                              <p className="font-medium text-gray-900">Services</p>
                              <ul className="text-gray-600 text-sm">
                                {state.services.map(s => (
                                  <li key={s.id} className="break-words">• {s.name} - {s.price.toLocaleString()} FCFA</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="flex items-center">
                            <FiCalendar className="w-5 h-5 text-primary-600 mr-3" />
                            <div>
                              <p className="font-medium text-gray-900">Date & Heure</p>
                              <p className="text-gray-600 text-sm">
                                {state.date && new Date(state.date).toLocaleDateString('fr-FR', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })} à {state.time}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center">
                            <FiClock className="w-5 h-5 text-primary-600 mr-3" />
                            <div>
                              <p className="font-medium text-gray-900">Durée estimée</p>
                              <p className="text-gray-600 text-sm">{state.totalDuration} min</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notes ou demandes spéciales (optionnel)
                        </label>
                        <textarea
                          value={state.notes}
                          onChange={(e) => dispatch({ type: 'SET_NOTES', payload: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                          placeholder="Ex: Cheveux très épais, préférence pour un style naturel..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons — fixed bottom bar on mobile */}
            <div className="fixed bottom-0 left-0 right-0 z-[70] flex justify-between gap-2 border-t border-gray-200 bg-white/95 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0 sm:shadow-none">
              <button
                onClick={handleBack}
                className="flex-1 sm:flex-none px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center text-sm font-medium"
              >
                <FiChevronLeft className="w-4 h-4 mr-1" />
                {state.step === 1 ? 'Annuler' : 'Retour'}
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-[2] sm:flex-none px-6 py-3 rounded-xl bg-primary-600 text-white transition-colors flex items-center justify-center text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 hover:bg-primary-700"
              >
                {state.step === 3 ? 'Passer au paiement' : 'Continuer'}
                <FiChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            {/* Spacer for fixed bottom bar on mobile */}
            <div className="h-16 sm:hidden" />
          </div>

          {/* Sidebar - Booking Summary */}
          <div className="lg:col-span-1">
            <BookingSummary salon={salon} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Booking
