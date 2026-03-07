import React, { useState } from "react";
import SectionCard from "../../components/UI/SectionCard.jsx";
import DataTable from "../../components/UI/DataTable.jsx";
import { FiUsers, FiSearch, FiRefreshCw, FiMail, FiPhone, FiCalendar } from "react-icons/fi";


export default function ClientsSection({ clients, loading, onRefresh }) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const filtered = clients.filter(
    c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  /* ── Toolbar (shared) ── */
  const Toolbar = () => (
    <div className="flex gap-2 w-full">
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Rechercher un client..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-inter text-base shadow-sm transition"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
          <FiSearch className="w-5 h-5" />
        </span>
      </div>
    </div>
  );

  /* ── Mobile card ── */
  const ClientCard = ({ row }) => (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSelectedUser(row)}
          className="w-11 h-11 shrink-0 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-lg text-blue-600 font-bold"
        >
          {row.name?.[0]?.toUpperCase() || row.email?.[0]?.toUpperCase()}
        </button>
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setSelectedUser(row)}
            className="text-sm font-semibold text-slate-800 truncate block max-w-full text-left hover:text-blue-700 transition"
          >
            {row.name || row.email}
          </button>
          <div className="text-xs text-slate-500 truncate flex items-center gap-1">
            <FiMail className="w-3 h-3 shrink-0" /> {row.email}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="flex items-center gap-1"><FiPhone className="w-3 h-3 text-slate-400" /> {row.phoneNumber || "-"}</span>
        <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3 text-slate-400" /> {row.createdAt ? new Date(row.createdAt).toLocaleDateString("fr-FR") : "-"}</span>
      </div>
    </div>
  );

  return (
    <>
      <SectionCard
        icon={<FiUsers className="w-6 h-6" />}
        title="Clients"
        subtitle="Liste de tous les clients inscrits sur la plateforme."
        right={
          <button
            onClick={onRefresh}
            className="bg-blue-600 text-white rounded-xl px-4 py-2 font-semibold shadow-sm hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition flex items-center gap-2"
          >
            Actualiser
          </button>
        }
      >
        {/* ─── MOBILE: card list (< lg) ─── */}
        <div className="lg:hidden flex flex-col gap-3">
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <Toolbar />
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="self-end flex items-center gap-2 bg-blue-600 text-white rounded-xl px-3 py-2 font-semibold shadow-sm hover:bg-blue-700 transition text-sm"
              >
                <FiRefreshCw className="w-4 h-4" /> Actualiser
              </button>
            )}
          </div>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 animate-pulse">
                <div className="flex gap-3 mb-3"><div className="w-11 h-11 rounded-full bg-slate-100" /><div className="flex-1 space-y-2"><div className="h-4 bg-slate-100 rounded w-3/4" /><div className="h-3 bg-slate-100 rounded w-1/2" /></div></div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-slate-400 font-medium">
              <FiUsers className="w-10 h-10 text-slate-200" />
              <span>Aucun client trouvé</span>
            </div>
          ) : (
            filtered.map(row => <ClientCard key={row.id} row={row} />)
          )}
        </div>

        {/* ─── DESKTOP: table (>= lg) ─── */}
        <div className="hidden lg:block">
          <DataTable
            loading={loading}
            columns={[ 
              {
                key: "email",
                label: (
                  <span className="flex justify-start w-full pl-6">Email</span>
                ),
                render: row => (
                  <button
                    type="button"
                    onClick={() => setSelectedUser(row)}
                    className="inline-block px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100 shadow-sm hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition cursor-pointer text-left w-full"
                    title="Voir le profil complet"
                  >
                    <span className="text-xs text-emerald-700 font-inter tracking-wide underline underline-offset-2 text-left w-full">{row.email}</span>
                  </button>
                ),
              },
              {
                key: "phoneNumber",
                label: "Téléphone",
                render: row => <span className="text-xs text-slate-700">{row.phoneNumber || "-"}</span>,
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
            onRefresh={onRefresh}
            emptyLabel="Aucun client trouvé"
            pagination={null}
          />
        </div>
      </SectionCard>
      {/* Carte modale premium infos client */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 max-w-md w-full p-8 relative animate-fade-in">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              title="Fermer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center text-4xl text-emerald-500 font-montserrat shadow">
                {selectedUser.name?.[0]?.toUpperCase() || selectedUser.email?.[0]?.toUpperCase()}
              </div>
              <div className="text-center">
                <div className="text-2xl font-montserrat text-emerald-700 mb-1">{selectedUser.name || <span className='italic text-slate-400'>(Nom inconnu)</span>}</div>
                <div className="text-base font-inter text-emerald-600 mb-2">{selectedUser.email}</div>
                <div className="flex flex-col gap-1 text-sm text-slate-500 font-inter">
                  <span><b>Téléphone :</b> {selectedUser.phoneNumber || <span className='italic text-slate-400'>Non renseigné</span>}</span>
                  <span><b>Inscription :</b> {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('fr-FR') : '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
