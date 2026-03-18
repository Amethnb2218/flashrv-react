import React, { useState } from "react";
import SectionCard from "../../components/UI/SectionCard.jsx";
import DataTable from "../../components/UI/DataTable.jsx";
import StatusBadge from "../../components/UI/StatusBadge.jsx";
import {
  FiUserCheck,
  FiSearch,
  FiRefreshCw,
  FiUsers,
  FiMapPin,
  FiPhone,
  FiCalendar,
  FiMail,
  FiTrash2,
  FiCheck,
  FiX,
  FiSlash,
} from "react-icons/fi";

export default function PendingProsSection({
  pros,
  loading,
  onRefresh,
  onApprove,
  onReject,
  onRestrict,
  onDelete,
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);

  const filtered = (pros || []).filter(
    (pro) =>
      (pro.name?.toLowerCase().includes(search.toLowerCase()) ||
        pro.email?.toLowerCase().includes(search.toLowerCase())) &&
      (status === "all" || pro.status === status)
  );

  const ActionButtons = ({ row, compact = false }) => (
    <div className={`flex items-center ${compact ? "justify-end gap-1.5 flex-wrap" : "gap-1.5"}`}>
      <button
        onClick={() => onApprove(row)}
        className={`inline-flex items-center gap-1 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 active:scale-95 transition ${
          compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-1.5 text-xs"
        }`}
        title="Valider ce PRO"
        aria-label="Valider ce PRO"
      >
        <FiCheck className="w-3.5 h-3.5" />
        <span className={compact ? "sr-only 2xl:not-sr-only" : ""}>Valider</span>
      </button>
      <button
        onClick={() => onReject(row)}
        className={`inline-flex items-center gap-1 rounded-lg bg-rose-500 text-white font-semibold hover:bg-rose-600 active:scale-95 transition ${
          compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-1.5 text-xs"
        }`}
        title="Refuser ce PRO"
        aria-label="Refuser ce PRO"
      >
        <FiX className="w-3.5 h-3.5" />
        <span className={compact ? "sr-only 2xl:not-sr-only" : ""}>Refuser</span>
      </button>
      <button
        onClick={() => onRestrict && onRestrict(row)}
        className={`inline-flex items-center gap-1 rounded-lg bg-gold-500 text-white font-semibold hover:bg-gold-600 active:scale-95 transition ${
          compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-1.5 text-xs"
        }`}
        title="Restreindre les droits"
        aria-label="Restreindre les droits"
      >
        <FiSlash className="w-3.5 h-3.5" />
        <span className={compact ? "sr-only 2xl:not-sr-only" : ""}>Restreindre</span>
      </button>
      {onDelete && (
        <button
          onClick={() => onDelete(row)}
          className={`inline-flex items-center gap-1 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 active:scale-95 transition ${
            compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-1.5 text-xs"
          }`}
          title="Supprimer definitivement"
          aria-label="Supprimer definitivement"
        >
          <FiTrash2 className="w-3.5 h-3.5" />
          <span className={compact ? "sr-only 2xl:not-sr-only" : ""}>Supprimer</span>
        </button>
      )}
    </div>
  );

  const Toolbar = () => (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Rechercher un PRO..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-primary-200 rounded-xl text-primary-700 placeholder:text-primary-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-inter text-sm shadow-sm transition"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-300">
          <FiSearch className="w-5 h-5" />
        </span>
      </div>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="border border-primary-200 px-4 py-2.5 rounded-xl bg-white text-primary-700 font-semibold shadow-sm text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
      >
        <option value="all">Tous</option>
        <option value="PENDING">En attente</option>
        <option value="APPROVED">Approuves</option>
        <option value="REJECTED">Refuses</option>
        <option value="SUSPENDED">Suspendus</option>
      </select>
    </div>
  );

  const ProCard = ({ row }) => (
    <div className="group rounded-xl border border-primary-200 bg-white hover:border-primary-300 hover:shadow-md transition-all duration-200 overflow-hidden">
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
              className="text-sm font-semibold text-primary-900 truncate hover:text-emerald-600 transition"
            >
              {row.name || row.email}
            </button>
            <StatusBadge status={row.status} size="sm" />
          </div>
          <div className="text-xs text-primary-500 truncate mt-0.5 flex items-center gap-1">
            <FiMail className="w-3 h-3 shrink-0 text-primary-400" />
            {row.email}
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-primary-500">
        {row.salon?.name && (
          <span className="flex items-center gap-1 font-medium text-primary-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            {row.salon.name}
            {row.salon.city && (
              <span className="text-primary-400 font-normal flex items-center gap-0.5 ml-1">
                <FiMapPin className="w-3 h-3" />
                {row.salon.city}
              </span>
            )}
          </span>
        )}
        <span className="flex items-center gap-1">
          <FiPhone className="w-3 h-3 text-primary-400" />
          {row.phoneNumber || "-"}
        </span>
        <span className="flex items-center gap-1">
          <FiCalendar className="w-3 h-3 text-primary-400" />
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString("fr-FR") : "-"}
        </span>
      </div>

      <div className="px-4 py-2.5 border-t border-primary-100 bg-primary-50/50">
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
      <div className="lg:hidden flex flex-col gap-3">
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-primary-50 border border-primary-100">
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

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-primary-200 bg-white p-4 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-primary-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-primary-100 rounded w-3/4" />
                  <div className="h-3 bg-primary-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-primary-100 rounded w-full mb-2" />
              <div className="h-8 bg-primary-100 rounded w-2/3" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-primary-400 font-medium">
            <FiUsers className="w-10 h-10 text-primary-200" />
            <span>Aucun PRO en attente</span>
          </div>
        ) : (
          filtered.map((row) => <ProCard key={row.id} row={row} />)
        )}
      </div>

      <div className="hidden lg:block">
        <DataTable
          loading={loading}
          columns={[
            {
              key: "email",
              label: "Professionnel",
              render: (row) => (
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
                    <div className="text-sm font-semibold text-primary-800 truncate">
                      {row.name || row.email}
                    </div>
                    <div className="text-xs text-primary-500 truncate">{row.email}</div>
                  </div>
                </button>
              ),
            },
            {
              key: "phoneNumber",
              label: "Telephone",
              render: (row) => <span className="text-xs text-primary-700">{row.phoneNumber || "-"}</span>,
            },
            {
              key: "salon",
              label: "Salon",
              render: (row) => (
                <div className="text-xs text-primary-700 space-y-0.5">
                  <div className="font-semibold text-primary-800">{row.salon?.name || "-"}</div>
                  <div className="text-primary-500">{row.salon?.city || "-"}</div>
                  <div className="text-primary-500">{row.salon?.phone || "-"}</div>
                </div>
              ),
            },
            {
              key: "status",
              label: "Statut",
              render: (row) => (
                <div className="flex justify-center">
                  <StatusBadge status={row.status} />
                </div>
              ),
              align: "text-center",
            },
            {
              key: "createdAt",
              label: "Inscription",
              render: (row) => (
                <span className="text-xs text-primary-500">
                  {row.createdAt ? new Date(row.createdAt).toLocaleDateString("fr-FR") : "-"}
                </span>
              ),
            },
          ]}
          data={filtered}
          toolbar={<Toolbar />}
          rowActions={(row) => <ActionButtons row={row} compact />}
          emptyLabel="Aucun PRO en attente"
          pagination={null}
        />
      </div>

      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-primary-200 max-w-md w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-r from-emerald-500 to-teal-500 px-6 pt-6 pb-10">
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
              <div className="w-16 h-16 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-emerald-600 bg-emerald-50">
                {selectedUser.name?.[0]?.toUpperCase() || selectedUser.email?.[0]?.toUpperCase()}
              </div>
              <h3 className="mt-3 text-lg font-bold text-primary-900">
                {selectedUser.name || <span className="italic text-primary-400">Nom inconnu</span>}
              </h3>
              <p className="text-sm text-primary-500">{selectedUser.email}</p>
              <div className="mt-2">
                <StatusBadge status={selectedUser.status} />
              </div>

              <div className="w-full mt-5 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <FiPhone className="w-4 h-4 text-primary-400 shrink-0" />
                  <span className="text-primary-600">
                    {selectedUser.phoneNumber || <span className="italic text-primary-400">Non renseigne</span>}
                  </span>
                </div>
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
                {selectedUser.salon?.name && (
                  <>
                    <div className="border-t border-primary-100 pt-3 mt-3">
                      <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2">Salon</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center text-primary-400">S</span>
                      <span className="font-medium text-primary-700">{selectedUser.salon.name}</span>
                    </div>
                    {selectedUser.salon.city && (
                      <div className="flex items-center gap-3 text-sm">
                        <FiMapPin className="w-4 h-4 text-primary-400 shrink-0" />
                        <span className="text-primary-600">{selectedUser.salon.city}</span>
                      </div>
                    )}
                    {selectedUser.salon.phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <FiPhone className="w-4 h-4 text-primary-400 shrink-0" />
                        <span className="text-primary-600">{selectedUser.salon.phone}</span>
                      </div>
                    )}
                    {selectedUser.salon.email && (
                      <div className="flex items-center gap-3 text-sm">
                        <FiMail className="w-4 h-4 text-primary-400 shrink-0" />
                        <span className="text-primary-600">{selectedUser.salon.email}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="w-full mt-5 pt-4 border-t border-primary-100">
                <ActionButtons row={selectedUser} />
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
