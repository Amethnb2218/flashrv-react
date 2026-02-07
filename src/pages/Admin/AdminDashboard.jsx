import React, { useState, useEffect } from 'react';
import AddAdminForm from './AddAdminForm';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, FiUserCheck, FiUserX, FiClock, 
  FiBarChart2, FiSearch, FiFilter, FiRefreshCw,
  FiCheck, FiX, FiAlertTriangle, FiShield,
  FiMail, FiPhone, FiCalendar, FiMoreVertical
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/UI/StatCard';
import PendingProsSection from './PendingProsSection';
import ClientsSection from './ClientsSection';
import AdminsSection from './AdminsSection';
import StatsSection from './StatsSection';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Composant Client Row avec menu d'actions
export function ClientRow({ client }) {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <tr className="group border-b border-blue-100 hover:bg-blue-50 transition-all duration-150">
      <td className="py-4 px-6">
        <div>
          <p className="text-xs font-extrabold tracking-widest uppercase text-blue-700 font-poppins">{client.name}</p>
          <p className="text-xs font-extrabold tracking-widest lowercase text-blue-700 font-poppins">{client.email?.toLowerCase()}</p>
        </div>
      </td>
      <td className="py-4 px-6 text-xs font-extrabold tracking-widest uppercase text-blue-700 font-poppins">{client.phoneNumber || '-'}</td>
      <td className="py-4 px-6 text-xs font-extrabold tracking-widest uppercase text-blue-700 font-poppins">{new Date(client.createdAt).toLocaleDateString('fr-FR')}</td>
      <td className="py-4 px-6 relative">
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full bg-white/10 hover:bg-blue-800/40 shadow-lg hover:shadow-yellow-400/40 transition-all duration-200 border border-white/10 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <FiMoreVertical className="w-5 h-5 text-blue-200 group-hover:text-yellow-400 transition-colors duration-200 drop-shadow-glow" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 mt-2 w-44 bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 z-10 animate-fade-in"
                style={{ boxShadow: '0 8px 32px 0 rgba(255, 255, 0, 0.10)' }}
                onClick={() => setShowMenu(false)}
              >
                <button className="w-full flex items-center gap-2 px-5 py-3 text-sm text-red-200 hover:bg-red-900/30 font-poppins tracking-wide transition-all duration-150 rounded-xl"><FiX className="w-4 h-4" />Supprimer</button>
                <button className="w-full flex items-center gap-2 px-5 py-3 text-sm text-orange-200 hover:bg-orange-900/30 font-poppins tracking-wide transition-all duration-150 rounded-xl"><FiShield className="w-4 h-4" />Restreindre</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </td>
    </tr>
  )
}

// Composant Admin Row
export function AdminRow({ admin, onRestrict }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showRestrictModal, setShowRestrictModal] = useState(false);
  const isRestricted = admin.isRestricted === true;

  return (
    <tr className="group border-b border-blue-100 hover:bg-blue-50 transition-all duration-150">
      <td className="py-4 px-6">
        <div>
          <p className="font-bold text-[#1E293B] text-lg md:text-xl font-poppins tracking-wide">{admin.name}</p>
          <p className="text-sm text-[#334155] font-semibold font-inter tracking-wide">{admin.email}</p>
          {isRestricted && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-orange-400/20 text-orange-200 font-semibold shadow">Restreint</span>
          )}
        </div>
      </td>
      <td className="py-4 px-6 text-xs font-extrabold tracking-widest uppercase text-blue-700 font-poppins">{admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('fr-FR') : '-'}</td>
      <td className="py-4 px-6">
        <span className="inline-block px-4 py-1 rounded-full text-xs font-bold font-poppins tracking-wider border bg-white text-blue-900">{admin.adminType || '-'}</span>
      </td>
      <td className="py-4 px-6 text-xs font-extrabold tracking-widest uppercase text-blue-700 font-poppins">{admin.adminType || '-'}</td>
      <td className="py-4 px-6 relative">
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full bg-white/10 hover:bg-blue-800/40 shadow-lg hover:shadow-yellow-400/40 transition-all duration-200 border border-white/10 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <FiMoreVertical className="w-5 h-5 text-blue-200 group-hover:text-yellow-400 transition-colors duration-200 drop-shadow-glow" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-10"
                onClick={() => setShowMenu(false)}
              >
                <button className="w-full flex items-center gap-2 px-4 py-3 text-sm text-orange-700 hover:bg-orange-50" onClick={() => setShowRestrictModal(true)}>Restreindre</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </td>
    </tr>
  );
}
// Composant User Row
export function UserRow({ user, onAction, isLoading, onRestrict, isSuperAdmin }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showRestrictModal, setShowRestrictModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'approve'|'reject'|'suspend'|'reactivate', userId }

  const statusConfig = {
    PENDING: { label: 'En attente', color: 'bg-gradient-to-r from-yellow-400/30 to-yellow-200/20 text-yellow-200 border border-yellow-300/30 shadow-yellow-400/20' },
    APPROVED: { label: 'Approuvé', color: 'bg-gradient-to-r from-green-400/30 to-green-200/20 text-green-200 border border-green-300/30 shadow-green-400/20' },
    REJECTED: { label: 'Refusé', color: 'bg-gradient-to-r from-red-400/30 to-red-200/20 text-red-200 border border-red-300/30 shadow-red-400/20' },
    SUSPENDED: { label: 'Suspendu', color: 'bg-gradient-to-r from-gray-400/30 to-gray-200/20 text-gray-200 border border-gray-300/30 shadow-gray-400/20' },
  };
  const status = statusConfig[user.status] || statusConfig.PENDING;
  const isRestricted = user.canCreateService === false || user.canBook === false || user.isPublic === false;

  return (
    <tr className="group border-b border-blue-100 hover:bg-blue-50 transition-all duration-150 text-blue-600">
      <td className="py-3 px-4">
        <div>
          <p className="font-bold text-blue-800 text-base md:text-lg font-montserrat tracking-wide uppercase">{user.name}</p>
          <p className="text-xs md:text-sm text-blue-500 font-inter tracking-wide lowercase">{user.email?.toLowerCase()}</p>
          {isRestricted && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 font-semibold font-inter shadow">Restreint</span>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-xs md:text-sm font-semibold tracking-widest uppercase text-blue-500 font-inter">{user.phoneNumber || '-'}</td>
      <td className="py-3 px-4">
        <span className={`inline-block px-3 py-0.5 rounded-full text-xs md:text-sm font-bold font-montserrat tracking-wider border text-blue-600 bg-blue-50 ${status.color}`}>{status.label}</span>
      </td>
      <td className="py-3 px-4 text-xs md:text-sm font-semibold tracking-widest uppercase text-blue-500 font-inter">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '-'}</td>
      <td className="py-3 px-4 relative">
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full bg-white/10 hover:bg-blue-200/40 shadow-lg hover:shadow-blue-400/40 transition-all duration-200 border border-white/10 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <FiMoreVertical className="w-5 h-5 text-blue-600 group-hover:text-blue-800 transition-colors duration-200 drop-shadow-glow" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-10"
                onClick={() => setShowMenu(false)}
              >
                <button className="w-full flex items-center gap-2 px-4 py-2 text-xs md:text-sm text-blue-700 hover:bg-blue-100 font-montserrat" onClick={() => setShowRestrictModal(true)}>Restreindre</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </td>
    </tr>
  );
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
  const [clients, setClients] = useState([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [clientSearch, setClientSearch] = useState('')

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  // Action réelle pour approuver ou refuser un PRO
  const handleAction = async (userId, actionType) => {
    let url = '';
    let method = 'PATCH';
    if (actionType === 'approve') {
      url = `${API_URL}/admin/pro/${userId}/approve`;
    } else if (actionType === 'reject') {
      url = `${API_URL}/admin/pro/${userId}/reject`;
    } else {
      alert(`Action inconnue: ${actionType}`);
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Erreur lors de la mise à jour du statut');
      } else {
        fetchData();
      }
    } catch (e) {
      alert('Erreur réseau lors de la validation/refus');
    } finally {
      setActionLoading(false);
    }
  }

  // Log temporaire pour debug
  useEffect(() => {
    if (pros && Array.isArray(pros)) {
      console.log('[DEBUG] PROS chargés:', pros);
    }
  }, [pros]);

  // Charger les données à chaque changement d'onglet PROs/pending ou stats
  useEffect(() => {
    if (["all", "pending", "stats"].includes(activeTab)) {
      fetchData();
    }
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let pros = [];
      let stats = null;
      // Charger les stats toujours
      try {
        const statsRes = await fetch(`${API_URL}/admin/stats`, { credentials: 'include' });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          stats = statsData.data || null;
        }
      } catch {}
      setStats(stats);

      // Charger les PROs selon l'onglet
      if (activeTab === 'pending') {
        try {
          const pendingRes = await fetch(`${API_URL}/admin/pro/pending`, { credentials: 'include' });
          if (pendingRes.ok) {
            const pendingData = await pendingRes.json();
            pros = pendingData.data?.pros || [];
          }
        } catch {}
      } else if (activeTab === 'all') {
        try {
          const allRes = await fetch(`${API_URL}/admin/pro/all`, { credentials: 'include' });
          if (allRes.ok) {
            const allData = await allRes.json();
            pros = allData.data?.pros || [];
          }
        } catch {}
      }
      setPros(pros);
    } catch (e) {
      setPros([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  } 

  // Gestion de restriction PRO
  const handleRestrict = async (userId, flags) => {
    try {
      await fetch(`${API_URL}/admin/pro/${userId}/restrict`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(flags),
      })
      fetchData()
    } catch (error) {
      alert('Erreur lors de la restriction')
    }
  }

  // Gestion des admins (onglet superadmin)
  const [admins, setAdmins] = useState([])
  useEffect(() => {
    if (activeTab === 'admins' && isSuperAdmin) {
      fetchAdmins()
    }
  }, [activeTab])
  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/admins`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAdmins(data.data.admins || [])
      } else {
        setAdmins([])
      }
    } catch (error) {
      setAdmins([])
    }
  }
  const handleRestrictAdmin = async (adminId, flags) => {
    try {
      await fetch(`${API_URL}/admin/admins/${adminId}/restrict`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(flags),
      })
      fetchAdmins()
    } catch (error) {
      alert('Erreur lors de la restriction admin')
    }
  }

  // Charger les clients quand l'onglet est actif
  useEffect(() => {
    if (activeTab === 'clients') fetchClients()
  }, [activeTab])
  const fetchClients = async () => {
    setClientsLoading(true)
    try {
      const res = await fetch(`${API_URL}/admin/clients`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setClients(data.data.clients || [])
      } else {
        setClients([])
      }
    } catch (e) {
      setClients([])
    }
    setClientsLoading(false)
  }

  // Filtrer les PROs
  const filteredPros = pros.filter(pro => {
    const matchesSearch = pro.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pro.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || pro.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const tabs = [
    { id: 'pending', label: 'En attente', icon: FiClock, count: stats?.pros?.pending || 0 },
    { id: 'all', label: 'Tous les PROs', icon: FiUsers, count: stats?.pros?.total || 0 },
    { id: 'clients', label: 'Clients', icon: FiUserCheck, count: stats?.clients || 0 },
    { id: 'stats', label: 'Statistiques', icon: FiBarChart2 },
  ]
  if (isSuperAdmin) {
    tabs.push({ id: 'admins', label: 'Administrateurs', icon: FiShield })
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <header className="sticky top-0 z-20 flex flex-col gap-2 py-8 mb-8 bg-white rounded-2xl shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1E293B] font-poppins">Dashboard FlashRV'</h1>
            {isSuperAdmin && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold border border-blue-300">
                <FiShield className="w-5 h-5 text-blue-500" />
                Super Admin
              </span>
            )}
            {!isSuperAdmin && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold border border-green-200">
                Admin
              </span>
            )}
          </div>
          <p className="text-base text-[#64748B] font-normal mt-2 ml-1">Plateforme de gestion intelligente et monitoring temps réel</p>
        </header>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <StatCard
              icon={FiClock}
              label="En attente"
              value={stats.pros?.pending || 0}
              color="yellow"
            />
            <StatCard
              icon={FiUserCheck}
              label="PROs approuvés"
              value={stats.pros?.approved || 0}
              color="green"
            />
            <StatCard
              icon={FiUsers}
              label="Total clients"
              value={stats.clients || 0}
              color="blue"
            />
            <StatCard
              icon={FiCalendar}
              label="Réservations"
              value={stats.appointments || 0}
              color="purple"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-base font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-700 border-b-2 border-blue-700 bg-blue-50'
                    : 'text-gray-500 hover:text-blue-700 hover:bg-blue-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'pending' && (
          <PendingProsSection
            pros={pros}
            loading={isLoading}
            onRefresh={fetchData}
            onApprove={user => handleAction(user.id, 'approve')}
            onReject={user => handleAction(user.id, 'reject')}
            onRestrict={user => handleRestrict(user.id, { canCreateService: false, canBook: false, isPublic: false })}
          />
        )}
        {activeTab === 'all' && (
          <PendingProsSection
            pros={pros}
            loading={isLoading}
            onRefresh={fetchData}
            onApprove={user => handleAction(user.id, 'approve')}
            onReject={user => handleAction(user.id, 'reject')}
            onRestrict={user => handleRestrict(user.id, { canCreateService: false, canBook: false, isPublic: false })}
          />
        )}
        {activeTab === 'clients' && (
          <ClientsSection
            clients={clients}
            loading={clientsLoading}
            onRefresh={fetchClients}
          />
        )}

        {activeTab === 'stats' && stats && (
          <StatsSection stats={stats} />
        )}

        {activeTab === 'admins' && isSuperAdmin && (
          <AdminsSection admins={admins} loading={false} onRefresh={fetchAdmins} />
        )}
      </div>
    </div>
  );
}
