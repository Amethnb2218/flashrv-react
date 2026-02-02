import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FiUsers, FiUserCheck, FiUserX, FiClock, 
  FiBarChart2, FiSearch, FiFilter, FiRefreshCw,
  FiCheck, FiX, FiAlertTriangle, FiShield,
  FiMail, FiPhone, FiCalendar, FiMoreVertical
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

// Composant Stat Card
function StatCard({ icon: Icon, label, value, color, trend }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '+' : ''}{trend}% ce mois
            </p>
          )}
        </div>
        <div className={`p-4 rounded-full ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

// Composant User Row
function UserRow({ user, onAction, isLoading }) {
  const [showMenu, setShowMenu] = useState(false)

  const statusConfig = {
    PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
    APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Refusé', color: 'bg-red-100 text-red-700' },
    SUSPENDED: { label: 'Suspendu', color: 'bg-orange-100 text-orange-700' },
  }

  const status = statusConfig[user.status] || statusConfig.PENDING

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
            {user.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-medium text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <span className="text-sm text-gray-600">{user.phone || '-'}</span>
      </td>
      <td className="py-4 px-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      </td>
      <td className="py-4 px-4">
        <span className="text-sm text-gray-500">
          {new Date(user.createdAt).toLocaleDateString('fr-FR')}
        </span>
      </td>
      <td className="py-4 px-4">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <FiMoreVertical className="w-4 h-4 text-gray-500" />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-10"
                onClick={() => setShowMenu(false)}
              >
                {user.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => onAction(user.id, 'approve')}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-green-600 hover:bg-green-50"
                    >
                      <FiCheck className="w-4 h-4" />
                      Approuver
                    </button>
                    <button
                      onClick={() => onAction(user.id, 'reject')}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                    >
                      <FiX className="w-4 h-4" />
                      Refuser
                    </button>
                  </>
                )}
                {user.status === 'APPROVED' && (
                  <button
                    onClick={() => onAction(user.id, 'suspend')}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-orange-600 hover:bg-orange-50"
                  >
                    <FiAlertTriangle className="w-4 h-4" />
                    Suspendre
                  </button>
                )}
                {(user.status === 'SUSPENDED' || user.status === 'REJECTED') && (
                  <button
                    onClick={() => onAction(user.id, 'reactivate')}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-blue-600 hover:bg-blue-50"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    Réactiver
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </td>
    </tr>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('pending')
  const [pros, setPros] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState(false)

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  // Charger les données
  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Charger les stats
      const statsRes = await fetch(`${API_URL}/admin/stats`, {
        credentials: 'include',
      })
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      // Charger les PROs selon l'onglet
      let endpoint = activeTab === 'pending' 
        ? '/admin/pro/pending' 
        : '/admin/pro/all'
      
      const prosRes = await fetch(`${API_URL}${endpoint}`, {
        credentials: 'include',
      })
      if (prosRes.ok) {
        const prosData = await prosRes.json()
        setPros(prosData.pros || prosData)
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Actions sur un PRO
  const handleAction = async (userId, action) => {
    setActionLoading(true)
    try {
      const res = await fetch(`${API_URL}/admin/pro/${userId}/${action}`, {
        method: 'PATCH',
        credentials: 'include',
      })
      
      if (res.ok) {
        // Recharger les données
        fetchData()
      } else {
        const error = await res.json()
        alert(error.message || 'Erreur lors de l\'action')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur de connexion')
    } finally {
      setActionLoading(false)
    }
  }

  // Filtrer les PROs
  const filteredPros = pros.filter(pro => {
    const matchesSearch = pro.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pro.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || pro.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const tabs = [
    { id: 'pending', label: 'En attente', icon: FiClock, count: stats?.pendingPros || 0 },
    { id: 'all', label: 'Tous les PROs', icon: FiUsers, count: stats?.totalPros || 0 },
    { id: 'stats', label: 'Statistiques', icon: FiBarChart2 },
  ]

  if (isSuperAdmin) {
    tabs.push({ id: 'admins', label: 'Administrateurs', icon: FiShield })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Tableau de bord Admin
          </h1>
          <p className="text-gray-600 mt-1">
            Gérez les professionnels et surveillez la plateforme
          </p>
          {isSuperAdmin && (
            <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              <FiShield className="w-4 h-4" />
              Super Admin
            </span>
          )}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={FiClock}
              label="En attente"
              value={stats.pendingPros || 0}
              color="yellow"
            />
            <StatCard
              icon={FiUserCheck}
              label="PROs approuvés"
              value={stats.approvedPros || 0}
              color="green"
            />
            <StatCard
              icon={FiUsers}
              label="Total clients"
              value={stats.totalClients || 0}
              color="blue"
            />
            <StatCard
              icon={FiCalendar}
              label="Réservations"
              value={stats.totalAppointments || 0}
              color="purple"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab !== 'stats' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Filters */}
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {activeTab === 'all' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="PENDING">En attente</option>
                  <option value="APPROVED">Approuvés</option>
                  <option value="REJECTED">Refusés</option>
                  <option value="SUSPENDED">Suspendus</option>
                </select>
              )}
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : filteredPros.length === 0 ? (
                <div className="text-center py-12">
                  <FiUsers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun professionnel trouvé</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                        Professionnel
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                        Téléphone
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                        Statut
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                        Inscription
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPros.map(pro => (
                      <UserRow
                        key={pro.id}
                        user={pro}
                        onAction={handleAction}
                        isLoading={actionLoading}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Stats Tab Content */}
        {activeTab === 'stats' && stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Répartition des utilisateurs</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Clients</span>
                  <span className="font-semibold">{stats.totalClients || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Professionnels approuvés</span>
                  <span className="font-semibold text-green-600">{stats.approvedPros || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">En attente de validation</span>
                  <span className="font-semibold text-yellow-600">{stats.pendingPros || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Comptes suspendus</span>
                  <span className="font-semibold text-red-600">{stats.suspendedUsers || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Activité récente</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Réservations totales</span>
                  <span className="font-semibold">{stats.totalAppointments || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Réservations ce mois</span>
                  <span className="font-semibold">{stats.monthlyAppointments || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Revenus estimés</span>
                  <span className="font-semibold text-green-600">
                    {(stats.totalRevenue || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Admins Tab (Super Admin Only) */}
        {activeTab === 'admins' && isSuperAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4">
              Gestion des Administrateurs
            </h3>
            <p className="text-gray-600 mb-6">
              En tant que Super Admin, vous pouvez promouvoir des utilisateurs en Admin ou révoquer leurs droits.
            </p>
            {/* Admin management UI would go here */}
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <FiShield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Fonctionnalité de gestion des admins à implémenter
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
