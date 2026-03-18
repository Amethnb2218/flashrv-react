import React, { useState, useEffect, useRef, useCallback } from 'react';
import AddAdminForm from './AddAdminForm';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, FiUserCheck, FiClock, 
  FiBarChart2, FiRefreshCw, FiShield,
  FiCalendar, FiMessageSquare,
  FiBell, FiMapPin, FiX
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/UI/StatCard';
import PendingProsSection from './PendingProsSection';
import ClientsSection from './ClientsSection';
import AdminsSection from './AdminsSection';
import StatsSection from './StatsSection';
import { buildAuthHeaders } from '../../utils/authToken';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/** Helper: returns fetch options with auth headers (token + cookie) */
function authFetchOpts(extra = {}) {
  return {
    credentials: 'include',
    headers: buildAuthHeaders({
      'Content-Type': 'application/json',
      ...(extra.headers || {}),
    }),
    ...extra,
  };
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
  const [feedbacks, setFeedbacks] = useState([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [disputes, setDisputes] = useState([])
  const [disputesLoading, setDisputesLoading] = useState(false)
  const [disputeScope, setDisputeScope] = useState('open')
  const [disputeCounts, setDisputeCounts] = useState({ open: 0, resolved: 0, total: 0 })

  // Notification bell state
  const [notifOpen, setNotifOpen] = useState(false)
  const [pendingPros, setPendingPros] = useState([])
  const notifRef = useRef(null)

  // Track "last seen" pending count in sessionStorage
  const NOTIF_KEY = 'flashrv_admin_last_seen_pending'
  const getLastSeen = () => parseInt(sessionStorage.getItem(NOTIF_KEY) || '0', 10)
  const pendingCount = stats?.pros?.pending || 0
  const unreadCount = Math.max(0, pendingCount - getLastSeen())

  // Close notification dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch pending pros for notification dropdown
  const fetchPendingForNotif = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/pro/pending`, authFetchOpts())
      if (res.ok) {
        const data = await res.json()
        setPendingPros(data.data?.pros || [])
      }
    } catch {}
  }, [])

  // When bell is opened, mark as seen and load pending data
  const toggleNotif = () => {
    if (!notifOpen) {
      fetchPendingForNotif()
      sessionStorage.setItem(NOTIF_KEY, String(pendingCount))
    }
    setNotifOpen(prev => !prev)
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const feedbackTypeLabels = {
    bug: 'Bug',
    suggestion: 'Suggestion',
    problem: 'Problème',
  }

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
      const res = await fetch(url, authFetchOpts({ method }));
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
        const statsRes = await fetch(`${API_URL}/admin/stats`, authFetchOpts());
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          stats = statsData.data || null;
        }
      } catch {}
      setStats(stats);

      // Charger les PROs selon l'onglet
      if (activeTab === 'pending') {
        try {
          const pendingRes = await fetch(`${API_URL}/admin/pro/pending`, authFetchOpts());
          if (pendingRes.ok) {
            const pendingData = await pendingRes.json();
            pros = pendingData.data?.pros || [];
          }
        } catch {}
      } else if (activeTab === 'all') {
        try {
          const allRes = await fetch(`${API_URL}/admin/pro/all`, authFetchOpts());
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
      await fetch(`${API_URL}/admin/pro/${userId}/restrict`, authFetchOpts({
        method: 'PATCH',
        body: JSON.stringify(flags),
      }))
      fetchData()
    } catch (error) {
      alert('Erreur lors de la restriction')
    }
  }

  const handleDeletePro = async (pro) => {
    if (!pro?.id) return
    const label = pro?.salon?.name || pro?.name || pro?.email || 'ce professionnel'
    const confirmed = window.confirm(`Supprimer définitivement ${label} ? Cette action est irréversible.`)
    if (!confirmed) return

    setActionLoading(true)
    try {
      const res = await fetch(`${API_URL}/admin/pro/${pro.id}`, authFetchOpts({ method: 'DELETE' }))
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(payload?.message || 'Suppression impossible pour ce compte PRO.')
        return
      }
      fetchData()
      alert('Compte PRO supprimé avec succès.')
    } catch (e) {
      alert('Erreur réseau lors de la suppression du compte PRO.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteClient = async (client) => {
    if (!client?.id) return
    const label = client?.name || client?.email || 'ce client'
    const confirmed = window.confirm(`Supprimer définitivement ${label} ? Cette action est irréversible.`)
    if (!confirmed) return

    setActionLoading(true)
    try {
      const res = await fetch(`${API_URL}/admin/clients/${client.id}`, authFetchOpts({ method: 'DELETE' }))
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(payload?.message || 'Suppression impossible pour ce compte client.')
        return
      }
      fetchClients()
      alert('Compte client supprimé avec succès.')
    } catch (e) {
      alert('Erreur réseau lors de la suppression du compte client.')
    } finally {
      setActionLoading(false)
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
      const res = await fetch(`${API_URL}/admin/admins`, authFetchOpts())
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
      await fetch(`${API_URL}/admin/admins/${adminId}/restrict`, authFetchOpts({
        method: 'PATCH',
        body: JSON.stringify(flags),
      }))
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
      const res = await fetch(`${API_URL}/admin/clients`, authFetchOpts())
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

  // Charger les feedbacks quand l'onglet est actif
  useEffect(() => {
    if (activeTab === 'feedback') fetchFeedback()
  }, [activeTab])
  const fetchFeedback = async () => {
    setFeedbackLoading(true)
    try {
      const res = await fetch(`${API_URL}/admin/feedback`, authFetchOpts())
      if (res.ok) {
        const data = await res.json()
        setFeedbacks(data.data?.feedbacks || [])
      } else {
        setFeedbacks([])
      }
    } catch (e) {
      setFeedbacks([])
    }
    setFeedbackLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'disputes') {
      fetchDisputes(disputeScope)
    }
  }, [activeTab, disputeScope])

  const fetchDisputes = async (scope = 'open') => {
    setDisputesLoading(true)
    try {
      const res = await fetch(`${API_URL}/admin/disputes?scope=${encodeURIComponent(scope)}`, authFetchOpts())
      if (res.ok) {
        const data = await res.json()
        setDisputes(data?.data?.disputes || [])
        setDisputeCounts(data?.data?.counts || { open: 0, resolved: 0, total: 0 })
      } else {
        setDisputes([])
      }
    } catch (e) {
      setDisputes([])
    }
    setDisputesLoading(false)
  }

  const resolveDispute = async (orderId, decision) => {
    if (!orderId || !decision) return
    const upper = String(decision).toUpperCase()
    let reason = ''
    if (upper === 'REJECT') {
      reason = window.prompt("Motif du rejet (obligatoire):", "") || ""
      if (!String(reason || '').trim()) {
        alert('Le motif du rejet est obligatoire.')
        return
      }
      const confirmed = window.confirm('Confirmer le rejet du litige et l annulation de la commande ?')
      if (!confirmed) return
    }
    try {
      const res = await fetch(`${API_URL}/admin/disputes/${orderId}/resolve`, authFetchOpts({
        method: 'PATCH',
        body: JSON.stringify({
          decision: upper,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        }),
      }))
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(payload?.message || 'Erreur lors de la resolution du litige')
        return
      }
      fetchDisputes(disputeScope)
      alert(upper === 'APPROVE' ? 'Litige valide: paiement confirme.' : 'Litige rejete: commande annulee.')
    } catch (e) {
      alert('Erreur reseau lors de la resolution du litige')
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
    { id: 'pending', label: 'En attente', icon: FiClock, count: stats?.pros?.pending || 0 },
    { id: 'all', label: 'Tous les PROs', icon: FiUsers, count: stats?.pros?.total || 0 },
    { id: 'clients', label: 'Clients', icon: FiUserCheck, count: stats?.clients || 0 },
    { id: 'disputes', label: 'Litiges paiements', icon: FiMessageSquare, count: disputeCounts?.open || 0 },
    { id: 'feedback', label: 'Feedback', icon: FiMessageSquare, count: feedbacks.length },
    { id: 'stats', label: 'Statistiques', icon: FiBarChart2 },
  ]
  if (isSuperAdmin) {
    tabs.push({ id: 'admins', label: 'Administrateurs', icon: FiShield })
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <header className="sticky top-0 z-20 flex flex-col gap-2 py-5 sm:py-8 mb-6 sm:mb-8 bg-white rounded-2xl shadow-md border border-primary-200 px-4 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#1E293B] font-poppins">Dashboard Style • Flow</h1>
            <div className="flex items-center gap-3">
              {/* Notification bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={toggleNotif}
                  className="relative p-2.5 rounded-xl bg-primary-50 border border-primary-200 hover:bg-primary-100 transition"
                  title="Notifications"
                >
                  <FiBell className="w-5 h-5 text-primary-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold ring-2 ring-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <>
                      {/* Mobile backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-40 sm:hidden"
                        onClick={() => setNotifOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-x-3 top-20 z-50 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 w-auto sm:w-96 bg-white rounded-2xl shadow-2xl border border-primary-200 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-primary-100 flex items-center justify-between">
                          <h3 className="text-sm font-bold text-primary-800">Nouvelles inscriptions PRO</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-primary-400">{pendingCount} en attente</span>
                            <button onClick={() => setNotifOpen(false)} className="sm:hidden p-1 rounded-lg hover:bg-primary-100 transition">
                              <FiX className="w-4 h-4 text-primary-400" />
                            </button>
                          </div>
                        </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-primary-50">
                        {pendingPros.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-primary-400">Aucune inscription en attente</div>
                        ) : (
                          pendingPros.slice(0, 10).map(pro => (
                            <button
                              key={pro.id}
                              onClick={() => {
                                setActiveTab('pending')
                                setNotifOpen(false)
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-primary-50 transition flex items-start gap-3"
                            >
                              <div className="w-9 h-9 shrink-0 rounded-full bg-gold-50 border border-gold-200 flex items-center justify-center text-sm font-bold text-gold-600">
                                {pro.name?.[0]?.toUpperCase() || pro.email?.[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-primary-800 truncate">{pro.salon?.name || pro.name || pro.email}</div>
                                <div className="flex items-center gap-2 text-xs text-primary-500 mt-0.5">
                                  {pro.salon?.city && <span className="flex items-center gap-0.5"><FiMapPin className="w-3 h-3" />{pro.salon.city}</span>}
                                  <span>{pro.email}</span>
                                </div>
                                <div className="text-[11px] text-primary-400 mt-0.5">
                                  {pro.createdAt ? new Date(pro.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                                </div>
                              </div>
                              <span className="shrink-0 mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gold-50 text-gold-700 border border-gold-200">
                                <FiClock className="w-3 h-3 mr-0.5" />En attente
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                      {pendingPros.length > 0 && (
                        <div className="px-4 py-2.5 border-t border-primary-100">
                          <button
                            onClick={() => { setActiveTab('pending'); setNotifOpen(false); }}
                            className="w-full text-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
                          >
                            Voir tous les PROs en attente →
                          </button>
                        </div>
                      )}
                    </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              {/* Role badge */}
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
          </div>
          <p className="text-sm sm:text-base text-[#64748B] font-normal mt-2 ml-1">Plateforme de gestion intelligente et monitoring temps réel</p>
        </header>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 mb-8 sm:mb-12">
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
        <div className="bg-white rounded-xl shadow border border-primary-200 mb-6">
          <div className="flex border-b border-primary-200 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-700 border-b-2 border-blue-700 bg-blue-50'
                    : 'text-primary-500 hover:text-blue-700 hover:bg-blue-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-primary-100 text-primary-600'
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
            onDelete={isSuperAdmin ? handleDeletePro : undefined}
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
            onDelete={isSuperAdmin ? handleDeletePro : undefined}
          />
        )}
        {activeTab === 'clients' && (
          <ClientsSection
            clients={clients}
            loading={clientsLoading}
            onRefresh={fetchClients}
            onDelete={isSuperAdmin ? handleDeleteClient : undefined}
          />
        )}

        {activeTab === 'feedback' && (
          <div className="bg-white rounded-xl shadow border border-primary-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-primary-900">Retours utilisateurs</h2>
                <p className="text-sm text-primary-500">Bugs, suggestions et problèmes signalés.</p>
              </div>
              <button
                onClick={fetchFeedback}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-200 text-sm font-semibold text-primary-700 hover:bg-primary-50"
              >
                <FiRefreshCw className="w-4 h-4" />
                Actualiser
              </button>
            </div>

            {feedbackLoading ? (
              <div className="text-sm text-primary-500">Chargement…</div>
            ) : feedbacks.length === 0 ? (
              <div className="text-sm text-primary-500">Aucun feedback pour le moment.</div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map((fb) => {
                  const payload = fb.payload || {}
                  const typeLabel = feedbackTypeLabels[fb.type] || fb.type
                  const items =
                    fb.type === 'bug'
                      ? [
                          { label: 'Page', value: payload.page },
                          { label: 'Étapes', value: payload.steps },
                          { label: 'Attendu', value: payload.expected },
                          { label: 'Obtenu', value: payload.actual },
                        ]
                      : fb.type === 'suggestion'
                      ? [
                          { label: 'Idée', value: payload.idea },
                          { label: 'Bénéfice', value: payload.benefit },
                        ]
                      : [
                          { label: 'Problème', value: payload.problem },
                          { label: 'Impact', value: payload.impact },
                        ]

                  return (
                    <div key={fb.id} className="border border-primary-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gold-50 text-gold-700">
                            <FiMessageSquare className="w-3.5 h-3.5" />
                            {typeLabel}
                          </div>
                          <p className="mt-2 text-xs text-primary-500">
                            {fb.createdAt ? new Date(fb.createdAt).toLocaleString('fr-FR') : ''}
                          </p>
                          <p className="mt-1 text-sm text-primary-700">
                            {fb.user?.name || fb.user?.email || fb.contact || 'Anonyme'}
                          </p>
                          {fb.contact && (
                            <p className="text-xs text-primary-400">Contact : {fb.contact}</p>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-primary-600 bg-primary-100 px-3 py-1 rounded-full">
                          {fb.status || 'NEW'}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 mt-4">
                        {items
                          .filter((item) => item.value)
                          .map((item) => (
                            <div key={item.label} className="text-sm">
                              <div className="text-xs text-primary-500">{item.label}</div>
                              <div className="text-primary-800">{item.value}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'disputes' && (
          <div className="bg-white rounded-xl shadow border border-primary-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl font-bold text-primary-900">Litiges paiements</h2>
                <p className="text-sm text-primary-500">Validation manuelle des paiements contestes.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={disputeScope}
                  onChange={(e) => setDisputeScope(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-primary-200 text-sm font-medium text-primary-700"
                >
                  <option value="open">Ouverts</option>
                  <option value="resolved">Resolus</option>
                  <option value="all">Tous</option>
                </select>
                <button
                  onClick={() => fetchDisputes(disputeScope)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-200 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                >
                  <FiRefreshCw className="w-4 h-4" />
                  Actualiser
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold">Ouverts: {disputeCounts.open || 0}</span>
              <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-800 font-semibold">Resolus: {disputeCounts.resolved || 0}</span>
              <span className="px-2.5 py-1 rounded-full bg-primary-100 text-primary-700 font-semibold">Total: {disputeCounts.total || 0}</span>
            </div>

            {disputesLoading ? (
              <div className="text-sm text-primary-500">Chargement…</div>
            ) : disputes.length === 0 ? (
              <div className="text-sm text-primary-500">Aucun litige pour ce filtre.</div>
            ) : (
              <div className="space-y-4">
                {disputes.map((order) => {
                  const payment = order?.payment || {}
                  const methodLabel = String(payment.manualMethod || payment.method || order.paymentMethod || '')
                    .replaceAll('_', ' ')
                    .trim() || 'Paiement direct'
                  const statusKey = String(order.status || '').toUpperCase()
                  const isOpen = statusKey === 'DISPUTED' || (String(payment.proofStatus || '').toUpperCase() === 'REJECTED' && statusKey === 'PENDING_PAYMENT')
                  return (
                    <div key={order.id} className="border border-primary-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-primary-500">Commande #{String(order.id || '').slice(-8).toUpperCase()}</p>
                          <p className="text-sm font-semibold text-primary-900 mt-0.5">
                            {order?.salon?.name || 'Boutique'} · {order?.clientName || order?.client?.name || 'Client'}
                          </p>
                          <p className="text-xs text-primary-600 mt-0.5">
                            {methodLabel} · {(order.totalPrice || 0).toLocaleString()} FCFA
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isOpen ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                          {isOpen ? 'Litige ouvert' : 'Litige resolu'}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
                        <div className="bg-primary-50 rounded-xl p-3">
                          <p className="text-xs text-primary-500">Reference transaction</p>
                          <p className="font-semibold text-primary-800">{payment.proofReference || '—'}</p>
                          <p className="text-xs text-primary-500 mt-2">Montant envoye</p>
                          <p className="font-semibold text-primary-800">{Number(payment.amount || 0).toLocaleString()} FCFA</p>
                        </div>
                        <div className="bg-primary-50 rounded-xl p-3">
                          <p className="text-xs text-primary-500">Numero envoyeur</p>
                          <p className="font-semibold text-primary-800">{payment.phoneNumber || '—'}</p>
                          <p className="text-xs text-primary-500 mt-2">Motif du pro</p>
                          <p className="font-semibold text-primary-800 break-words">{payment.proofRejectionReason || 'Non specifie'}</p>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          <button
                            onClick={() => resolveDispute(order.id, 'APPROVE')}
                            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
                          >
                            Valider paiement
                          </button>
                          <button
                            onClick={() => resolveDispute(order.id, 'REJECT')}
                            className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-50 transition"
                          >
                            Rejeter et annuler
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <StatsSection stats={stats} />
        )}

        {activeTab === 'admins' && isSuperAdmin && (
          <>
            <AddAdminForm onAdminAdded={fetchAdmins} />
            <AdminsSection admins={admins} loading={false} onRefresh={fetchAdmins} />
          </>
        )}
      </div>
    </div>
  );
}
