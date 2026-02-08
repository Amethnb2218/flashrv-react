import React, { useState } from "react";
import SectionCard from "../../components/UI/SectionCard.jsx";
import DataTable from "../../components/UI/DataTable.jsx";
import StatusBadge from "../../components/UI/StatusBadge.jsx";
import { FiUserCheck, FiSearch } from "react-icons/fi";

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
      <DataTable
        loading={loading}
        columns={[
          // Nom & Prénom supprimé, on ne garde que l'email
          {
            key: "email",
            label: (
              <span className="flex justify-start w-full pl-6">Email</span>
            ),
            render: row => (
              <button
                type="button"
                onClick={() => setSelectedUser(row)}
                className="inline-block px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100 shadow-sm hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition cursor-pointer"
                title="Voir le profil complet"
              >
                <span className="text-xs text-emerald-700 font-inter tracking-wide underline underline-offset-2">{row.email}</span>
              </button>
            ),
          },
          {
            key: "phoneNumber",
            label: "Téléphone",
            render: row => <span className="text-xs text-slate-700">{row.phoneNumber || "-"}</span>,
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
        toolbar={
          <div className="flex gap-2 w-full">
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
        }
        rowActions={row => (
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(row)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 font-semibold text-xs shadow-sm border border-blue-100 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              title="Valider ce PRO"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Valider
            </button>
            <button
              onClick={() => onReject(row)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-rose-50 text-rose-700 font-semibold text-xs shadow-sm border border-rose-100 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-100 transition"
              title="Refuser ce PRO"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              Refuser
            </button>
            <button
              onClick={() => onRestrict && onRestrict(row)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-amber-50 text-amber-700 font-semibold text-xs shadow-sm border border-amber-100 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-100 transition"
              title="Restreindre les droits"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
              Restreindre
            </button>
          </div>
        )}
        onRefresh={onRefresh}
        emptyLabel="Aucun PRO en attente"
        pagination={null}
      />
    {/* Carte modale premium infos user */}
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
                <span><b>Statut :</b> {selectedUser.status || '-'}</span>
                <span><b>Inscription :</b> {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('fr-FR') : '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </SectionCard>
  );
}
