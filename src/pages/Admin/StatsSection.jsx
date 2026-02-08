import React from "react";
import SectionCard from "../../components/UI/SectionCard.jsx";
import { FiBarChart2 } from "react-icons/fi";

export default function StatsSection({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
      <SectionCard
        icon={<FiBarChart2 className="w-6 h-6" />}
        title="Répartition des utilisateurs"
        subtitle="Vue d'ensemble des différents types d'utilisateurs sur la plateforme."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-700 font-medium">Clients</span>
            <span className="font-semibold text-slate-900">{stats.clients || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-700 font-medium">Professionnels approuvés</span>
            <span className="font-semibold text-emerald-700">{stats.pros?.approved || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-700 font-medium">En attente de validation</span>
            <span className="font-semibold text-amber-700">{stats.pros?.pending || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-700 font-medium">Comptes suspendus</span>
            <span className="font-semibold text-orange-700">0</span>
          </div>
        </div>
      </SectionCard>
      <SectionCard
        icon={<FiBarChart2 className="w-6 h-6" />}
        title="Activité récente"
        subtitle="Statistiques d'activité et de performance de la plateforme."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-700 font-medium">Réservations totales</span>
            <span className="font-semibold text-slate-900">{stats.appointments || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-700 font-medium">Réservations ce mois</span>
            <span className="font-semibold text-slate-900">0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-700 font-medium">Revenus estimés</span>
            <span className="font-semibold text-slate-900">0 FCFA</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
