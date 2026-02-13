import { createContext, useContext, useReducer, useEffect } from 'react'

const BookingContext = createContext()

const initialState = {
  salon: null,
  services: [],
  date: null,
  time: null,
  coiffeur: null,
  notes: '',
  clientFirstName: '',
  clientLastName: '',
  clientPhone: '',
  clientAddress: '',
  totalPrice: 0,
  totalDuration: 0,
  bookingId: null,
  step: 1,
}

function bookingReducer(state, action) {
  switch (action.type) {
    case 'SET_SALON':
      return {
        ...state,
        salon: action.payload,
      }
    case 'ADD_SERVICE':
      const existingService = state.services.find(s => s.id === action.payload.id)
      if (existingService) return state
      
      const newServices = [...state.services, action.payload]
      return {
        ...state,
        services: newServices,
        totalPrice: newServices.reduce((sum, s) => sum + s.price, 0),
        totalDuration: newServices.reduce((sum, s) => sum + s.duration, 0),
      }
    case 'REMOVE_SERVICE':
      const filteredServices = state.services.filter(s => s.id !== action.payload)
      return {
        ...state,
        services: filteredServices,
        totalPrice: filteredServices.reduce((sum, s) => sum + s.price, 0),
        totalDuration: filteredServices.reduce((sum, s) => sum + s.duration, 0),
      }
    case 'SET_DATE':
      return {
        ...state,
        date: action.payload,
      }
    case 'SET_TIME':
      return {
        ...state,
        time: action.payload,
      }
    case 'SET_COIFFEUR':
      return {
        ...state,
        coiffeur: action.payload,
      }
    case 'SET_NOTES':
      return {
        ...state,
        notes: action.payload,
      }
    case 'SET_CLIENT_DETAILS':
      return {
        ...state,
        ...action.payload,
      }
    case 'SET_STEP':
      return {
        ...state,
        step: action.payload,
      }
    case 'SET_BOOKING_ID':
      return {
        ...state,
        bookingId: action.payload,
      }
    case 'NEXT_STEP':
      return {
        ...state,
        step: Math.min(state.step + 1, 4),
      }
    case 'PREV_STEP':
      return {
        ...state,
        step: Math.max(state.step - 1, 1),
      }
    case 'LOAD_BOOKING':
      return {
        ...state,
        ...action.payload,
      }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

export function BookingProvider({ children }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState)

  // Persist booking state
  useEffect(() => {
    if (state.salon || state.services.length > 0) {
      localStorage.setItem('flashrv_booking', JSON.stringify(state))
    }
  }, [state])

  // Load saved booking on mount
  useEffect(() => {
    const saved = localStorage.getItem('flashrv_booking')
    if (saved) {
      try {
        const booking = JSON.parse(saved)
        dispatch({ type: 'LOAD_BOOKING', payload: booking })
      } catch (error) {
        console.error('Error loading saved booking:', error)
      }
    }
  }, [])

  const setSalon = (salon) => {
    dispatch({ type: 'SET_SALON', payload: salon })
  }

  const addService = (service) => {
    dispatch({ type: 'ADD_SERVICE', payload: service })
  }

  const removeService = (serviceId) => {
    dispatch({ type: 'REMOVE_SERVICE', payload: serviceId })
  }

  const setDate = (date) => {
    dispatch({ type: 'SET_DATE', payload: date })
  }

  const setTime = (time) => {
    dispatch({ type: 'SET_TIME', payload: time })
  }

  const setCoiffeur = (coiffeur) => {
    dispatch({ type: 'SET_COIFFEUR', payload: coiffeur })
  }

  const setNotes = (notes) => {
    dispatch({ type: 'SET_NOTES', payload: notes })
  }

  const setClientDetails = (details) => {
    dispatch({ type: 'SET_CLIENT_DETAILS', payload: details || {} })
  }

  const nextStep = () => {
    dispatch({ type: 'NEXT_STEP' })
  }

  const prevStep = () => {
    dispatch({ type: 'PREV_STEP' })
  }

  const setStep = (step) => {
    dispatch({ type: 'SET_STEP', payload: step })
  }

  const setBookingId = (bookingId) => {
    dispatch({ type: 'SET_BOOKING_ID', payload: bookingId })
  }

  const resetBooking = () => {
    localStorage.removeItem('flashrv_booking')
    dispatch({ type: 'RESET' })
  }

  const value = {
    state,
    dispatch,
    ...state,
    setSalon,
    addService,
    removeService,
    setDate,
    setTime,
    setCoiffeur,
    setNotes,
    setClientDetails,
    nextStep,
    prevStep,
    setStep,
    setBookingId,
    resetBooking,
  }

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const context = useContext(BookingContext)
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider')
  }
  return context
}

export default BookingContext
