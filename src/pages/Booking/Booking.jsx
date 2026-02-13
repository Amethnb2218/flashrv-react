import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCheck, FiChevronLeft, FiChevronRight, FiClock, FiCalendar, FiUser, FiScissors } from 'react-icons/fi'
import { useBooking } from '../../context/BookingContext'
import { useAuth } from '../../context/AuthContext'
import ServiceCard from '../../components/Booking/ServiceCard'
import DatePicker from '../../components/Booking/DatePicker'
import TimeSlot from '../../components/Booking/TimeSlot'
import CoiffeurCard from '../../components/Booking/CoiffeurCard'
import BookingSummary from '../../components/Booking/BookingSummary'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import apiFetch from '@/api/client'

const steps = [
  { id: 1, title: 'Services', icon: FiScissors },
  { id: 2, title: 'Date & Heure', icon: FiCalendar },
  { id: 3, title: 'Confirmation', icon: FiCheck },
]

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

  if (loading) {
    return <LoadingSpinner />
  }

  if (!salon) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/20 py-8 relative overflow-x-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-orange-100/20 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <FiChevronLeft className="w-5 h-5 mr-1" />
            Retour
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Réservation - {salon.name}</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Complétez les étapes pour finaliser votre réservation</p>
        </div>

        {/* Steps indicator */}
        <div className="mb-6 sm:mb-8 overflow-x-auto pb-2">
          <div className="flex items-center justify-between gap-3 min-w-max sm:min-w-0 max-w-3xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all ${
                    state.step > step.id
                      ? 'bg-green-500 border-green-500 text-white'
                      : state.step === step.id
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {state.step > step.id ? (
                    <FiCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : (
                    <step.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                </div>
                <span
                  className={`ml-2 sm:ml-3 text-xs sm:text-base font-medium whitespace-nowrap ${
                    state.step >= step.id ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={`w-10 sm:w-24 h-1 mx-2 sm:mx-4 rounded ${
                      state.step > step.id ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
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
                className="bg-white rounded-2xl shadow-sm p-4 sm:p-6"
              >
                {/* Step 1: Services */}
                {state.step === 1 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                      Choisissez vos services
                    </h2>
                    <div className="grid gap-4">
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
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      Choisissez la date et l'heure
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Sélectionnez d'abord une date, puis choisissez un créneau disponible.
                    </p>
                    <div className="space-y-8">
                      <DatePicker
                        selectedDate={state.date}
                        onDateSelect={(date) => dispatch({ type: 'SET_DATE', payload: date })}
                      />
                      {state.date && (
                        <TimeSlot
                          selectedTime={state.time}
                          onTimeSelect={(time) => dispatch({ type: 'SET_TIME', payload: time })}
                          duration={state.totalDuration}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Confirmation */}
                {state.step === 3 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
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

            {/* Navigation Buttons */}
            <div className="sticky bottom-2 z-20 mt-6 flex flex-col-reverse sm:flex-row justify-between gap-3 rounded-2xl border border-gray-200 bg-white/95 p-2 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
              <button
                onClick={handleBack}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                <FiChevronLeft className="w-5 h-5 mr-2" />
                {state.step === 1 ? 'Annuler' : 'Précédent'}
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="w-full sm:w-auto px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.step === 3 ? 'Passer au paiement' : 'Continuer'}
                <FiChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
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

