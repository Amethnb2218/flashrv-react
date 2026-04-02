import React, { useState } from "react";
import SectionCard from "../../components/UI/SectionCard.jsx";
import DataTable from "../../components/UI/DataTable.jsx";
import ContextActionMenu from "../../components/UI/ContextActionMenu.jsx";
import { FiShield, FiSearch, FiRefreshCw, FiUsers, FiCalendar, FiX, FiSlash } from "react-icons/fi";

export default function AdminsSection({ admins, loading, onRefresh, onDelete, onRestrict }) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const filtered = (admins || []).filter(
    (a) =>
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (admin) => {
    if (onDelete) return onDelete(admin);
  };

  const handleRestrict = (admin) => {
    if (onRestrict) return onRestrict(admin);
  };

  const Toolbar = () => (
    <div className="flex gap-2 w-full">
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Rechercher un admin..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="app-input w-full pl-10 pr-4 py-2.5 font-inter text-sm shadow-sm transition"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-300">
          <FiSearch className="w-5 h-5" />
        </span>
      </div>
    </div>
  );

  const ActionButtons = ({ row, compact = false }) => (
    <div className={`flex items-center ${compact ? "justify-end gap-1.5 flex-wrap" : "gap-1.5"}`}>
      {onRestrict && (
        <button
          onClick={() => handleRestrict(row)}
          className={`inline-flex items-center gap-1 rounded-lg bg-gold-500 text-white font-semibold hover:bg-gold-600 active:scale-95 transition ${
            compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-1.5 text-xs"
          }`}
          title="Restreindre les droits"
          aria-label="Restreindre les droits"
        >
          <FiSlash className="w-3.5 h-3.5" />
          <span className={compact ? "sr-only 2xl:not-sr-only" : ""}>Restreindre</span>
        </button>
      )}
      {onDelete && (
        <button
          onClick={() => handleDelete(row)}
          className={`inline-flex items-center gap-1 rounded-lg bg-rose-500 text-white font-semibold hover:bg-rose-600 active:scale-95 transition ${
            compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-1.5 text-xs"
          }`}
          title="Retirer l admin"
          aria-label="Retirer l admin"
        >
          <FiX className="w-3.5 h-3.5" />
          <span className={compact ? "sr-only 2xl:not-sr-only" : ""}>Retirer</span>
        </button>
      )}
    </div>
  );

  const DesktopActionsMenu = ({ row }) => (
    <ContextActionMenu
      label={`Actions pour ${row.name || row.email}`}
      items={[
        {
          key: "restrict",
          label: "Restreindre",
          icon: FiSlash,
          hidden: !onRestrict,
          onClick: () => onRestrict && onRestrict(row),
        },
        {
          key: "delete",
          label: "Retirer l admin",
          icon: FiX,
          danger: true,
          hidden: !onDelete,
          onClick: () => onDelete && onDelete(row),
        },
      ]}
    />
  );

  const AdminCard = ({ row }) => (
    <div className="app-panel group overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <button
          type="button"
          onClick={() => setSelectedUser(row)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff2df] text-sm font-bold text-[#9d4f0d] shadow-sm"
        >
          {row.name?.[0]?.toUpperCase() || row.email?.[0]?.toUpperCase()}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedUser(row)}
              className="text-sm font-semibold text-primary-900 truncate hover:text-indigo-600 transition"
            >
              {row.name || row.email}
            </button>
            {row.adminType && (
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {row.adminType}
              </span>
            )}
          </div>
          <div className="text-xs text-primary-500 truncate mt-0.5">{row.email}</div>
        </div>
      </div>
      <div className="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-primary-500">
        <span className="flex items-center gap-1">
          <FiCalendar className="w-3 h-3 text-primary-400" />
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString("fr-FR") : "-"}
        </span>
      </div>
      {(onRestrict || onDelete) && (
        <div className="app-panel-header border-t px-4 py-2.5">
          <ActionButtons row={row} />
        </div>
      )}
    </div>
  );

  return (
    <SectionCard
      icon={<FiShield className="w-6 h-6" />}
      title="Administrateurs"
      subtitle="Gestion des administrateurs de la plateforme."
      right={
        <button
          onClick={onRefresh}
          className="btn-secondary flex items-center gap-2 px-4 py-2"
        >
          <FiRefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      }
    >
      <div className="lg:hidden flex flex-col gap-3">
        <div className="app-panel-muted flex flex-col gap-2 p-3">
          <Toolbar />
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="btn-secondary self-end flex items-center gap-2 px-3 py-2 text-sm"
            >
              <FiRefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          )}
        </div>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="app-panel animate-pulse p-4">
              <div className="flex gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-primary-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-primary-100 rounded w-3/4" />
                  <div className="h-3 bg-primary-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-primary-400 font-medium">
            <FiUsers className="w-10 h-10 text-primary-200" />
            <span>Aucun administrateur trouve</span>
          </div>
        ) : (
          filtered.map((row) => <AdminCard key={row.id} row={row} />)
        )}
      </div>

      <div className="hidden lg:block">
        <DataTable
          loading={loading}
          columns={[
            {
              key: "email",
              label: "Administrateur",
              render: (row) => (
                <button
                  type="button"
                  onClick={() => setSelectedUser(row)}
                  className="flex items-center gap-3 hover:opacity-80 transition"
                  title="Voir le profil complet"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff2df] text-xs font-bold text-[#9d4f0d]">
                    {row.name?.[0]?.toUpperCase() || row.email?.[0]?.toUpperCase()}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-sm font-semibold text-primary-800 truncate">{row.name || row.email}</div>
                    <div className="text-xs text-primary-500 truncate">{row.email}</div>
                  </div>
                </button>
              ),
            },
            {
              key: "createdAt",
              label: "Inscription",
              render: (row) => (
                <span className="app-badge inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold">
                  <FiCalendar className="w-3 h-3 text-primary-400" />
                  {row.createdAt ? new Date(row.createdAt).toLocaleDateString("fr-FR") : "-"}
                </span>
              ),
            },
            {
              key: "adminType",
              label: "Type",
              render: (row) => (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
                  {row.adminType || "-"}
                </span>
              ),
            },
          ]}
          data={filtered}
          toolbar={<Toolbar />}
          rowActions={onRestrict || onDelete ? (row) => <DesktopActionsMenu row={row} /> : undefined}
          onRefresh={onRefresh}
          emptyLabel="Aucun administrateur trouve"
          pagination={null}
        />
      </div>

      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="app-panel max-w-md w-full mx-4 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-[#2a1808] px-6 pb-10 pt-6 text-[#fff4e3]">
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
                title="Fermer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col items-center -mt-8 px-6 pb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#fff2df] text-2xl font-bold text-[#9d4f0d] shadow-lg">
                {selectedUser.name?.[0]?.toUpperCase() || selectedUser.email?.[0]?.toUpperCase()}
              </div>
              <h3 className="mt-3 text-lg font-bold text-primary-900">
                {selectedUser.name || <span className="italic text-primary-400">Nom inconnu</span>}
              </h3>
              <p className="text-sm text-primary-500">{selectedUser.email}</p>
              {selectedUser.adminType && (
                <span className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {selectedUser.adminType}
                </span>
              )}
              <div className="w-full mt-5 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <FiCalendar className="w-4 h-4 text-primary-400 shrink-0" />
                  <span className="text-primary-600">
                    {selectedUser.createdAt
                      ? new Date(selectedUser.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"}
                  </span>
                </div>
              </div>
              {(onRestrict || onDelete) && (
                <div className="w-full mt-5 pt-4 border-t border-primary-100">
                  <ActionButtons row={selectedUser} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
