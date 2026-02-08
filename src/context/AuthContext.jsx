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

  // Check for saved auth on mount et synchronise le cookie "token"
  useEffect(() => {
    const savedUser = localStorage.getItem('flashrv_user')
    const savedToken = localStorage.getItem('flashrv_token')
    // Synchronise le token dans un cookie pour Express backend
    if (savedToken) {
      document.cookie = `token=${savedToken}; path=/`;
    }
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

  // Login via backend API (vrai login, pose le cookie httpOnly)
  const login = async ({ identifier, password }) => {
    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Identifiants incorrects');
      }
      const user = data.data?.user;
      const token = data.data?.token || null;
      if (user && token) {
        localStorage.setItem('flashrv_user', JSON.stringify(user));
        localStorage.setItem('flashrv_token', token);
        document.cookie = `token=${token}; path=/`;
        dispatch({
          type: 'LOGIN',
          payload: { user, token }
        });
        return user;
      } else {
        throw new Error('Utilisateur ou token manquant');
      }
    } catch (err) {
      throw err;
    }
  };

  // Login via Google OAuth uniquement (backend /api/auth/google)
  const loginGoogle = async ({ credential, customName, accountType }) => {
    try {
      const res = await fetch('http://localhost:4000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential, customName, accountType }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Erreur de connexion Google');
      }
      const user = data.data?.user;
      if (user) {
        localStorage.setItem('flashrv_user', JSON.stringify(user));
        dispatch({
          type: 'LOGIN',
          payload: { user, token: null }
        });
        return user;
      } else {
        throw new Error('Utilisateur Google non trouvé');
      }
    } catch (err) {
      throw err;
    }
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
        document.cookie = `token=${token}; path=/`;
        
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
  const loginWithGoogle = async (credential, accountType = 'CLIENT') => {
    try {
      const body = accountType ? { credential, accountType } : { credential };
      const response = await fetch('http://localhost:4000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur de connexion Google');
      }
      const user = data.data.user;
      const token = 'google_auth_' + Date.now();
      localStorage.setItem('flashrv_user', JSON.stringify(user));
      localStorage.setItem('flashrv_token', token);
      document.cookie = `token=${token}; path=/`;
      dispatch({
        type: 'LOGIN',
        payload: { user, token },
      });
      return user;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };


  // Basic checkAuth implementation
  const checkAuth = () => {
    const user = localStorage.getItem('flashrv_user');
    const token = localStorage.getItem('flashrv_token');
    return !!(user && token);
  };

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