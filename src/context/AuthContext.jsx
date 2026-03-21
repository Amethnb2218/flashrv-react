import { createContext, useContext, useReducer, useEffect } from 'react'
import { disconnectRealtime } from '../utils/realtime'
import { subscribeToPush, unsubscribeFromPush } from '../utils/pushNotifications'
import toast from 'react-hot-toast'
import {
  clearAccountDeletionRecord,
  formatDeletionDeadline,
  isAccountDeletionPending,
  readAccountDeletionRecord,
} from '../utils/accountDeletion'
import { clearProOnboardingDraft, isProUser } from '../utils/proOnboarding'
import {
  buildAuthHeaders,
  clearAuthToken,
  clearCsrfToken,
  readAuthToken,
  writeAuthToken,
  writeCsrfToken,
} from '../utils/authToken'

const AuthContext = createContext()
const USER_STORAGE_KEY = 'flashrv_user'

const normalizeUserShape = (user) => {
  if (!user || typeof user !== 'object') return user
  const next = { ...user }
  if (next.phoneNumber && !next.phone) next.phone = next.phoneNumber
  if (next.phone && !next.phoneNumber) next.phoneNumber = next.phone
  if (next.avatar && !next.picture) next.picture = next.avatar
  if (next.picture && !next.avatar) next.avatar = next.picture
  return next
}

const readStoredUser = () => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    return normalizeUserShape(JSON.parse(raw))
  } catch (_) {
    return null
  }
}

const writeStoredUser = (user) => {
  if (typeof window === 'undefined') return

  try {
    if (!user) {
      window.sessionStorage.removeItem(USER_STORAGE_KEY)
      return
    }
    window.sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizeUserShape(user)))
  } catch (_) {
    // Ignore storage errors to avoid blocking authentication flows.
  }
}

const clearStoredUser = () => {
  writeStoredUser(null)
}

const initialUser = readStoredUser()
const initialToken = readAuthToken()

const initialState = {
  user: initialUser,
  token: initialToken,
  isAuthenticated: Boolean(initialUser && initialToken),
  isLoading: true,
}

const normalizeStatus = (status) => String(status || '').trim().toUpperCase()

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: normalizeUserShape(action.payload.user),
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
        user: normalizeUserShape({ ...state.user, ...action.payload }),
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
  const API_BASE = import.meta.env.VITE_API_URL || '/api'
  const authHeaders = (headers = {}, method = 'GET') => buildAuthHeaders(headers, method)

  const restoreCachedSession = () => {
    const cachedUser = readStoredUser()
    const cachedToken = readAuthToken()

    if (!cachedUser || !cachedToken) {
      return false
    }

    dispatch({
      type: 'LOGIN',
      payload: { user: cachedUser, token: cachedToken }
    })

    return true
  }

  const hydrateProAccountState = async (user) => {
    const normalizedUser = normalizeUserShape(user)

    if (!isProUser(normalizedUser)) {
      return normalizedUser
    }

    try {
      const response = await fetch(`${API_BASE}/salons/me`, {
        method: 'GET',
        headers: authHeaders({}, 'GET'),
        credentials: 'include',
        cache: 'no-store',
      })

      if (response.status === 404) {
        return normalizeUserShape({
          ...normalizedUser,
          hasSalon: false,
          salonId: null,
          salon: null,
        })
      }

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        return normalizedUser
      }

      const salon = data?.data || null
      if (!salon?.id) {
        return normalizeUserShape({
          ...normalizedUser,
          hasSalon: false,
          salonId: null,
          salon: null,
        })
      }

      clearProOnboardingDraft(normalizedUser)

      // Some session responses can miss user.status depending on auth middleware path.
      // In that case, use salon.status as a reliable fallback to keep redirects stable.
      const mergedStatus =
        normalizeStatus(normalizedUser?.status) ||
        normalizeStatus(salon?.status) ||
        ''

      return normalizeUserShape({
        ...normalizedUser,
        ...(mergedStatus ? { status: mergedStatus } : {}),
        hasSalon: true,
        salonId: salon.id,
        salon,
      })
    } catch (_) {
      return normalizedUser
    }
  }

  const restorePendingDeletionIfNeeded = (user) => {
    const normalizedUser = normalizeUserShape(user)
    const pendingDeletion = readAccountDeletionRecord(normalizedUser)

    if (!pendingDeletion) return normalizedUser

    if (isAccountDeletionPending(pendingDeletion)) {
      clearAccountDeletionRecord(normalizedUser)
      const deadline = formatDeletionDeadline(pendingDeletion)
      toast.success(
        deadline
          ? `Votre compte a ete reactive. La suppression prevue pour le ${deadline} a ete annulee.`
          : 'Votre compte a ete reactive.'
      )
    } else {
      clearAccountDeletionRecord(normalizedUser)
    }

    return normalizedUser
  }

  const persistAuthenticatedUser = async (apiUser, apiToken = null, apiCsrfToken = null) => {
    const restoredUser = restorePendingDeletionIfNeeded(apiUser)
    const hydratedUser = await hydrateProAccountState(restoredUser)
    const normalizedUser = normalizeUserShape(hydratedUser)

    writeStoredUser(normalizedUser)
    if (apiToken) {
      writeAuthToken(apiToken)
    }
    if (apiCsrfToken) {
      writeCsrfToken(apiCsrfToken)
    }
    const activeToken = apiToken || readAuthToken()

    dispatch({
      type: 'LOGIN',
      payload: { user: normalizedUser, token: activeToken }
    })

    subscribeToPush().catch(() => {})
    return normalizedUser
  }

  // Check for saved auth on mount et synchronise le cookie "token"
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/session`, {
          method: 'GET',
          headers: authHeaders({}, 'GET'),
          credentials: 'include',
          cache: 'no-store',
        })

        if (!response.ok) {
          if (restoreCachedSession()) {
            return
          }
          clearStoredUser()
          clearAuthToken()
          clearCsrfToken()
          dispatch({ type: 'SET_LOADING', payload: false })
          return
        }

        const data = await response.json().catch(() => null)
        const apiUser = data?.data?.user
        if (!apiUser) {
          clearStoredUser()
          clearAuthToken()
          clearCsrfToken()
          dispatch({ type: 'SET_LOADING', payload: false })
          return
        }

        await persistAuthenticatedUser(
          apiUser,
          data?.data?.token || null,
          data?.data?.csrfToken || null
        )
      } catch (error) {
        console.error('Error parsing saved user:', error)
        if (restoreCachedSession()) {
          return
        }
        clearStoredUser()
        clearAuthToken()
        clearCsrfToken()
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    restoreAuth()
  }, [])

  // Login via backend API (vrai login, pose le cookie httpOnly)
  const login = async ({ identifier, password }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }, 'POST'),
        credentials: 'include',
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Identifiants incorrects');
      }
      const user = data.data?.user;
      const token = data.data?.token || null;
      const csrfToken = data.data?.csrfToken || null;
      if (user) {
        return await persistAuthenticatedUser(user, token, csrfToken);
      } else {
        throw new Error('Utilisateur manquant');
      }
    } catch (err) {
      throw err;
    }
  };

  // Login via Google OAuth uniquement (backend /api/auth/google)
  const loginGoogle = async ({ credential, customName, accountType }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }, 'POST'),
        credentials: 'include',
        body: JSON.stringify({ credential, customName, accountType }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Erreur de connexion Google');
      }
      let user = data.data?.user;
      const token = data.data?.token || null;
      const csrfToken = data.data?.csrfToken || null;
      if (user) {
        return await persistAuthenticatedUser(user, token, csrfToken);
      } else {
        throw new Error('Utilisateur Google manquant');
      }
    } catch (err) {
      throw err;
    }
  }

  const register = async (userData) => {
    // Appel API backend pour créer un vrai utilisateur
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }, 'POST'),
      credentials: 'include',
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Erreur lors de l\'inscription');
    }
    const user = data.data?.user;
    const token = data.data?.token || null;
    const csrfToken = data.data?.csrfToken || null;
    if (user) {
      return await persistAuthenticatedUser(user, token, csrfToken);
    } else {
      throw new Error('Utilisateur manquant');
    }
  }

  const logout = async () => {
    try {
      // Call backend logout to clear cookie
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: authHeaders({}, 'POST'),
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
    clearAuthToken()
    clearCsrfToken()
    clearStoredUser()
    sessionStorage.removeItem('flashrv_booking')
    disconnectRealtime()
    unsubscribeFromPush().catch(() => {})
    dispatch({ type: 'LOGOUT' })
  }

  // Google OAuth login
  const loginWithGoogle = async (credential, accountType = 'CLIENT') => {
    try {
      const body = accountType ? { credential, accountType } : { credential };
      const response = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }, 'POST'),
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur de connexion Google');
      }
      const user = data.data?.user;
      const token = data.data?.token || null;
      const csrfToken = data.data?.csrfToken || null;
      if (!user) {
        throw new Error('Utilisateur Google manquant');
      }
      return await persistAuthenticatedUser(user, token, csrfToken);
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };


  // Basic checkAuth implementation
  const checkAuth = () => {
    return Boolean(readStoredUser() && readAuthToken())
  }

  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData }
    writeStoredUser(updatedUser)
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
