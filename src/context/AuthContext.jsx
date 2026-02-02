import { createContext, useContext, useReducer, useEffect } from 'react'

const AuthContext = createContext()

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
}

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      }
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      }
    default:
      return state
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Check for saved auth on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('flashrv_user')
    const savedToken = localStorage.getItem('flashrv_token')
    
    if (savedUser && savedToken) {
      try {
        const user = JSON.parse(savedUser)
        dispatch({
          type: 'LOGIN',
          payload: { user, token: savedToken }
        })
      } catch (error) {
        console.error('Error parsing saved user:', error)
        localStorage.removeItem('flashrv_user')
        localStorage.removeItem('flashrv_token')
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  const login = async (credentials) => {
    // API call simulation - Replace with actual backend API
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Production test accounts (hidden from UI)
        const registeredUsers = [
          {
            id: 1,
            email: 'amethsl2218@gmail.com',
            username: 'coiffeur_flash',
            phone: '+221776762784',
            password: 'Amethnb2218',
            name: 'Aminata Coiffeuse Pro',
            role: 'coiffeur',
            salonId: 1,
            avatar: null
          },
          {
            id: 2,
            email: 'meth19momo@gmail.com',
            username: 'client_flash',
            phone: '+221771234567',
            password: 'Amethnb2218',
            name: 'Mouhamed Client',
            role: 'client',
            avatar: null
          }
        ]

        // Normalize phone number for comparison
        const normalizePhone = (phone) => phone?.replace(/[\s\-\.]/g, '')
        const identifier = credentials.identifier || credentials.email
        const normalizedIdentifier = normalizePhone(identifier)

        // Find user by email, phone, or username
        const user = registeredUsers.find(u => {
          const matchEmail = u.email?.toLowerCase() === identifier?.toLowerCase()
          const matchPhone = normalizePhone(u.phone) === normalizedIdentifier
          const matchUsername = u.username?.toLowerCase() === identifier?.toLowerCase()
          return (matchEmail || matchPhone || matchUsername) && u.password === credentials.password
        })

        if (user) {
          const { password, ...userWithoutPassword } = user
          const token = 'demo_token_' + Date.now()
          
          localStorage.setItem('flashrv_user', JSON.stringify(userWithoutPassword))
          localStorage.setItem('flashrv_token', token)
          
          dispatch({
            type: 'LOGIN',
            payload: { user: userWithoutPassword, token }
          })
          resolve(userWithoutPassword)
        } else {
          reject(new Error('Email ou mot de passe incorrect'))
        }
      }, 1000)
    })
  }

  const register = async (userData) => {
    // Simulate API call - Replace with actual API
    return new Promise((resolve) => {
      setTimeout(() => {
        const newUser = {
          id: Date.now(),
          ...userData,
          role: userData.role || 'client',
          avatar: null
        }
        delete newUser.password
        
        const token = 'demo_token_' + Date.now()
        
        localStorage.setItem('flashrv_user', JSON.stringify(newUser))
        localStorage.setItem('flashrv_token', token)
        
        dispatch({
          type: 'LOGIN',
          payload: { user: newUser, token }
        })
        resolve(newUser)
      }, 1000)
    })
  }

  const logout = async () => {
    try {
      // Call backend logout to clear cookie
      await fetch('http://localhost:4000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
    localStorage.removeItem('flashrv_user')
    localStorage.removeItem('flashrv_token')
    localStorage.removeItem('flashrv_booking')
    dispatch({ type: 'LOGOUT' })
  }

  // Google OAuth login
  const loginWithGoogle = async (credential, customName = null) => {
    try {
      console.log('🔄 Sending Google credential to backend...')
      console.log('URL:', 'http://localhost:4000/api/auth/google')
      
      const response = await fetch('http://localhost:4000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({ credential, customName }),
      })

      console.log('📡 Response status:', response.status)
      const data = await response.json()
      console.log('📦 Response data:', data)

      if (!response.ok) {
        throw new Error(data.message || 'Erreur de connexion Google')
      }

      const user = data.data.user
      const token = 'google_auth_' + Date.now() // Token is in httpOnly cookie

      localStorage.setItem('flashrv_user', JSON.stringify(user))
      localStorage.setItem('flashrv_token', token)

      dispatch({
        type: 'LOGIN',
        payload: { user, token }
      })

      return user
    } catch (error) {
      console.error('Google login error:', error)
      throw error
    }
  }

  // Check auth status with backend
  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/auth/me', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const user = data.data.user
        const token = 'auth_' + Date.now()

        localStorage.setItem('flashrv_user', JSON.stringify(user))
        localStorage.setItem('flashrv_token', token)

        dispatch({
          type: 'LOGIN',
          payload: { user, token }
        })
        return user
      }
    } catch (error) {
      console.error('Check auth error:', error)
    }
    return null
  }

  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData }
    localStorage.setItem('flashrv_user', JSON.stringify(updatedUser))
    dispatch({ type: 'UPDATE_USER', payload: userData })
  }

  const value = {
    ...state,
    login,
    loginWithGoogle,
    checkAuth,
    register,
    logout,
    updateUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext

