import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCheck, FiChevronLeft, FiChevronRight, FiClock, FiCalendar, FiUser, FiScissors } from 'react-icons/fi'
import { useBooking } from '../../context/BookingContext'
import { getSalonById } from '../../data/salons'
import ServiceCard from '../../components/Booking/ServiceCard'
import DatePicker from '../../components/Booking/DatePicker'
import TimeSlot from '../../components/Booking/TimeSlot'
import CoiffeurCard from '../../components/Booking/CoiffeurCard'
import BookingSummary from '../../components/Booking/BookingSummary'
import LoadingSpinner from '../../components/UI/LoadingSpinner'

const steps = [
  { id: 1, title: 'Services', icon: FiScissors },
  { id: 2, title: 'Date & Heure', icon: FiCalendar },
  { id: 3, title: 'Confirmation', icon: FiCheck },
]

function Booking() {
  const { salonId } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useBooking()
  const [loading, setLoading] = useState(true)
  const [salon, setSalon] = useState(null)

  useEffect(() => {
    // Fetch salon data with services and coiffeurs
    const foundSalon = getSalonById(salonId)
    if (foundSalon) {
      setSalon(foundSalon)
      dispatch({ type: 'SET_SALON', payload: foundSalon })
    } else {
      navigate('/salons')
    }
    setLoading(false)
  }, [salonId, dispatch, navigate])

  const canProceed = () => {
    switch (state.step) {
      case 1:
        return state.services.length > 0
      case 2:
        return state.date && state.time
      case 3:
        return true // Confirmation step
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/20 py-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-orange-100/20 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <FiChevronLeft className="w-5 h-5 mr-1" />
            Retour
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Réservation - {salon.name}</h1>
          <p className="text-gray-600 mt-2">Complétez les étapes pour finaliser votre réservation</p>
        </div>

        {/* Steps indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                    state.step > step.id
                      ? 'bg-green-500 border-green-500 text-white'
                      : state.step === step.id
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {state.step > step.id ? (
                    <FiCheck className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-6 h-6" />
                  )}
                </div>
                <span
                  className={`hidden sm:block ml-3 font-medium ${
                    state.step >= step.id ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={`hidden sm:block w-24 h-1 mx-4 rounded ${
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
            <AnimatePresence mode="wait">
              <motion.div
                key={state.step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl shadow-sm p-6"
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
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                      Choisissez la date et l'heure
                    </h2>
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
                      <div className="bg-primary-50 rounded-xl p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Récapitulatif</h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-start">
                            <FiScissors className="w-5 h-5 text-primary-600 mt-0.5 mr-3" />
                            <div>
                              <p className="font-medium text-gray-900">Services</p>
                              <ul className="text-gray-600 text-sm">
                                {state.services.map(s => (
                                  <li key={s.id}>• {s.name} - {s.price.toLocaleString()} FCFA</li>
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
            <div className="flex justify-between mt-6">
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center"
              >
                <FiChevronLeft className="w-5 h-5 mr-2" />
                {state.step === 1 ? 'Annuler' : 'Précédent'}
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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

