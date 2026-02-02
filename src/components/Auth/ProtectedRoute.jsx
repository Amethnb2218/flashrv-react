import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Constantes pour les rôles et statuts
const ROLES = {
  CLIENT: 'CLIENT',
  PRO: 'PRO',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
}

const STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
}

/**
 * ProtectedRoute - Gère l'accès aux routes protégées
 * 
 * @param {React.ReactNode} children - Contenu à afficher si autorisé
 * @param {string|string[]} requiredRole - Rôle(s) requis (optionnel)
 * @param {boolean} requireApproved - Exiger un compte approuvé (PRO)
 * @param {boolean} adminOnly - Accès ADMIN et SUPER_ADMIN uniquement
 * @param {boolean} superAdminOnly - Accès SUPER_ADMIN uniquement
 */
function ProtectedRoute({ 
  children, 
  requiredRole = null,
  requireApproved = false,
  adminOnly = false,
  superAdminOnly = false
}) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  // Affichage du loader pendant le chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  // Rediriger vers login si non authentifié
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Vérifier si le compte est suspendu ou rejeté
  if (user?.status === STATUS.SUSPENDED || user?.status === STATUS.REJECTED) {
    return <Navigate to="/pro/pending" replace />
  }

  // Vérifier si un PRO est en attente de validation
  if (user?.role === ROLES.PRO && user?.status === STATUS.PENDING) {
    // Autoriser seulement certaines pages pour les PRO en attente
    const allowedPaths = ['/pro/pending', '/profile', '/logout']
    if (!allowedPaths.some(path => location.pathname.startsWith(path))) {
      return <Navigate to="/pro/pending" replace />
    }
  }

  // Vérifier l'accès SUPER_ADMIN uniquement
  if (superAdminOnly && user?.role !== ROLES.SUPER_ADMIN) {
    return <Navigate to="/" replace />
  }

  // Vérifier l'accès ADMIN (ADMIN ou SUPER_ADMIN)
  if (adminOnly) {
    const isAdmin = user?.role === ROLES.ADMIN || user?.role === ROLES.SUPER_ADMIN
    if (!isAdmin) {
      return <Navigate to="/" replace />
    }
  }

  // Vérifier si un PRO approuvé est requis
  if (requireApproved && user?.role === ROLES.PRO) {
    if (user?.status !== STATUS.APPROVED) {
      return <Navigate to="/pro/pending" replace />
    }
  }

  // Vérifier le rôle requis
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!roles.includes(user?.role)) {
      return <Navigate to="/" replace />
    }
  }

  return children
}

export { ROLES, STATUS }
export default ProtectedRoute

