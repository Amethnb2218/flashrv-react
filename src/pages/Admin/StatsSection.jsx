import React from 'react'
import { FiBarChart2 } from 'react-icons/fi'
import SectionCard from '../../components/UI/SectionCard.jsx'

export default function StatsSection({ stats }) {
  const siteVisits = stats?.siteVisits || {}

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
      <SectionCard
        icon={<FiBarChart2 className="w-6 h-6" />}
        title="Repartition des utilisateurs"
        subtitle="Vue d'ensemble des differents types d'utilisateurs sur la plateforme."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-primary-700 font-medium">Clients</span>
            <span className="font-semibold text-primary-900">{stats.clients || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-primary-700 font-medium">Professionnels approuves</span>
            <span className="font-semibold text-emerald-700">{stats.pros?.approved || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-primary-700 font-medium">En attente de validation</span>
            <span className="font-semibold text-gold-700">{stats.pros?.pending || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-primary-700 font-medium">Salons</span>
            <span className="font-semibold text-primary-900">{stats.salons || 0}</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={<FiBarChart2 className="w-6 h-6" />}
        title="Activité récente"
        subtitle="Statistiques d'activité et de trafic de la plateforme."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-primary-700 font-medium">Visites totales</span>
            <span className="font-semibold text-primary-900">{siteVisits.total || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-primary-700 font-medium">Visites aujourd'hui</span>
            <span className="font-semibold text-[#9d4f0d]">{siteVisits.today || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-primary-700 font-medium">Visiteurs uniques</span>
            <span className="font-semibold text-primary-900">{siteVisits.uniqueVisitors || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-primary-700 font-medium">Réservations totales</span>
            <span className="font-semibold text-primary-900">{stats.appointments || 0}</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-primary-500">
          1 visite = 1 session de navigation enregistrée sur le site.
        </p>
      </SectionCard>
    </div>
  )
}
