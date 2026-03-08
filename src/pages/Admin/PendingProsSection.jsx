import React, { useState } from "react";
import SectionCard from "../../components/UI/SectionCard.jsx";
import DataTable from "../../components/UI/DataTable.jsx";
import StatusBadge from "../../components/UI/StatusBadge.jsx";
import { FiUserCheck, FiSearch, FiRefreshCw, FiUsers, FiMapPin, FiPhone, FiCalendar, FiMail } from "react-icons/fi";

export default function PendingProsSection({ pros, loading, onRefresh, onApprove, onReject, onRestrict }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);

  const filtered = pros.filter(
    pro =>
      (pro.name?.toLowerCase().includes(search.toLowerCase()) ||
        pro.email?.toLowerCase().includes(search.toLowerCase())) &&
      (status === "all" || pro.status === status)
  );

  /* -- Action buttons (shared between card & table) -- */
  const ActionButtons = ({ row }) => (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onApprove(row)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-semibold text-xs hover:bg-emerald-600 active:scale-95 transition"
        title="Valider ce PRO"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        Valider
      </button>
      <button
        onClick={() => onReject(row)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500 text-white font-semibold text-xs hover:bg-rose-600 active:scale-95 transition"
        title="Refuser ce PRO"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        Refuser
      </button>
      <button
        onClick={() => onRestrict && onRestrict(row)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-white font-semibold text-xs hover:bg-amber-600 active:scale-95 transition"
        title="Restreindre les droits"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
        Restreindre
      </button>
    </div>
  );

  /* -- Toolbar (shared) -- */
  const Toolbar = () => (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Rechercher un PRO..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-inter text-base shadow-sm transition"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
          <FiSearch className="w-5 h-5" />
        </span>
      </div>
      <select
        value={status}
        onChange={e => setStatus(e.target.value)}
        className="border border-slate-200 px-4 py-2 rounded-xl bg-slate-50 text-slate-700 font-semibold shadow-sm text-base focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
      >
        <option value="all">Tous</option>
        <option value="PENDING">En attente</option>
        <option value="APPROVED">Approuvés</option>
        <option value="REJECTED">Refusés</option>
        <option value="SUSPENDED">Suspendus</option>
      </select>
    </div>
  );

  /* -- Mobile card for a single PRO (modern SaaS style) -- */
  const ProCard = ({ row }) => (
    <div className="group rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Top section: avatar + identity + badge */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <button
          type="button"
          onClick={() => setSelectedUser(row)}
          className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-sm text-white font-bold shadow-sm"
        >
          {row.name?.[0]?.toUpperCase() || row.email?.[0]?.toUpperCase()}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedUser(row)}
              className="text-sm font-semibold text-slate-900 truncate hover:text-emerald-600 transition"
            >
              {row.name || row.email}
            </button>
            <StatusBadge status={row.status} size="sm" />
          </div>
          <div className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
            <FiMail className="w-3 h-3 shrink-0 text-slate-400" />
            {row.email}
          </div>
        </div>
      </div>

      {/* Info section */}
      <div className="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {row.salon?.name && (
          <span className="flex items-center gap-1 font-medium text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            {row.salon.name}
            {row.salon.city && <span className="text-slate-400 font-normal flex items-center gap-0.5 ml-1"><FiMapPin className="w-3 h-3" />{row.salon.city}</span>}
          </span>
        )}
        <span className="flex items-center gap-1"><FiPhone className="w-3 h-3 text-slate-400" />{row.phoneNumber || "-"}</span>
        <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3 text-slate-400" />{row.createdAt ? new Date(row.createdAt).toLocaleDateString("fr-FR") : "-"}</span>
      </div>

      {/* Actions footer */}
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
        <ActionButtons row={row} />
      </div>
    </div>
  );

  return (
    <SectionCard
      icon={<FiUserCheck className="w-6 h-6" />}
      title="Professionnels en attente"
      subtitle="Validez ou refusez les nouveaux professionnels inscrits sur la plateforme."
      right={
        <button
          onClick={onRefresh}
          className="bg-blue-600 text-white rounded-xl px-4 py-2 font-semibold shadow-sm hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition flex items-center gap-2"
        >
          Actualiser
        </button>
      }
    >
      {/* --- MOBILE: card list (visible < lg) --- */}
      <div className="lg:hidden flex flex-col gap-3">
        {/* Toolbar */}
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <Toolbar />
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="self-end flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 font-semibold shadow-sm hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition text-sm"
            >
              <FiRefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          )}
        </div>

        {/* Cards */}
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded w-full mb-2" />
              <div className="h-8 bg-slate-100 rounded w-2/3" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400 font-medium">
            <FiUsers className="w-10 h-10 text-slate-200" />
            <span>Aucun PRO en attente</span>
          </div>
        ) : (
          filtered.map(row => <ProCard key={row.id} row={row} />)
        )}
      </div>

      {/* --- DESKTOP: table (visible >= lg) --- */}
      <div className="hidden lg:block">
        <DataTable
          loading={loading}
          columns={[
            {
              key: "email",
              label: "Professionnel",
              render: row => (
                <button
                  type="button"
                  onClick={() => setSelectedUser(row)}
                  className="flex items-center gap-3 hover:opacity-80 transition"
                  title="Voir le profil complet"
                >
                  <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs text-white font-bold">
                    {row.name?.[0]?.toUpperCase() || row.email?.[0]?.toUpperCase()}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{row.name || row.email}</div>
                    <div className="text-xs text-slate-500 truncate">{row.email}</div>
                  </div>
                </button>
              ),
            },
            {
              key: "phoneNumber",
              label: "Téléphone",
              render: row => <span className="text-xs text-slate-700">{row.phoneNumber || "-"}</span>,
            },
            {
              key: "salon",
              label: "Salon",
              render: row => (
                <div className="text-xs text-slate-700">
                  <div className="font-semibold text-slate-800">{row.salon?.name || "-"}</div>
                  <div className="text-slate-500">{row.salon?.city || "-"}</div>
                </div>
              ),
            },
            {
              key: "salonPhone",
              label: "Tél. salon",
              render: row => <span className="text-xs text-slate-700">{row.salon?.phone || "-"}</span>,
            },
            {
              key: "status",
              label: "Statut",
              render: row => (
                <div className="flex justify-center">
                  <StatusBadge status={row.status} />
                </div>
              ),
              align: "text-center"
            },
            {
              key: "createdAt",
              label: "Inscription",
              render: row => (
                <span className="text-xs text-slate-500">
                  {row.createdAt ? new Date(row.createdAt).toLocaleDateString("fr-FR") : "-"}
                </span>
              ),
            },
          ]}
          data={filtered}
          toolbar={<Toolbar />}
          rowActions={row => <ActionButtons row={row} />}
          onRefresh={onRefresh}
          emptyLabel="Aucun PRO en attente"
          pagination={null}
        />
      </div>
    {/* Modern detail modal */}
    {selectedUser && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* Modal header with gradient */}
          <div className="relative bg-gradient-to-r from-emerald-500 to-teal-500 px-6 pt-6 pb-10">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
              title="Fermer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {/* Avatar overlapping header */}
          <div className="flex flex-col items-center -mt-8 px-6 pb-6">
            <div className="w-16 h-16 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-emerald-600 bg-emerald-50">
              {selectedUser.name?.[0]?.toUpperCase() || selectedUser.email?.[0]?.toUpperCase()}
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">{selectedUser.name || <span className="italic text-slate-400">Nom inconnu</span>}</h3>
            <p className="text-sm text-slate-500">{selectedUser.email}</p>
            <div className="mt-2">
              <StatusBadge status={selectedUser.status} />
            </div>
            {/* Info grid */}
            <div className="w-full mt-5 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <FiPhone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-600">{selectedUser.phoneNumber || <span className="italic text-slate-400">Non renseigné</span>}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FiCalendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-600">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
              </div>
              {selectedUser.salon?.name && (
                <>
                  <div className="border-t border-slate-100 pt-3 mt-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Salon</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-4 h-4 shrink-0 flex items-center justify-center text-slate-400">??</span>
                    <span className="font-medium text-slate-700">{selectedUser.salon.name}</span>
                  </div>
                  {selectedUser.salon.city && (
                    <div className="flex items-center gap-3 text-sm">
                      <FiMapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-slate-600">{selectedUser.salon.city}</span>
                    </div>
                  )}
                  {selectedUser.salon.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <FiPhone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-slate-600">{selectedUser.salon.phone}</span>
                    </div>
                  )}
                  {selectedUser.salon.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <FiMail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-slate-600">{selectedUser.salon.email}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            {/* Modal actions */}
            <div className="w-full mt-5 pt-4 border-t border-slate-100">
              <ActionButtons row={selectedUser} />
            </div>
          </div>
        </div>
      </div>
    )}
    </SectionCard>
  );
}


