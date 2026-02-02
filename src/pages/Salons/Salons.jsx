import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiSearch, FiMapPin, FiFilter, FiX, FiStar, FiCamera } from 'react-icons/fi'
import { salons, neighborhoods, categories } from '../../data/salons'
import SalonCard from '../../components/Salon/SalonCard'

function Salons() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    neighborhood: searchParams.get('neighborhood') || '',
    category: searchParams.get('category') || '',
    priceRange: searchParams.get('priceRange') || '',
    minRating: searchParams.get('minRating') || '',
    sortBy: searchParams.get('sortBy') || 'rating',
    type: searchParams.get('type') || '', // 'shooting', 'barber' or ''
    salonType: searchParams.get('salonType') || '' // 'coiffure', 'beaute', 'mixte'
  })

  const filteredSalons = useMemo(() => {
    let result = [...salons]

    // Type filter (shooting studio, barber, or salon)
    if (filters.type === 'shooting') {
      result = result.filter(s => s.type === 'shooting')
    } else if (filters.type === 'barber') {
      result = result.filter(s => s.type === 'barber')
    } else if (filters.type === 'salon') {
      result = result.filter(s => s.type !== 'shooting' && s.type !== 'barber')
    }

    // Salon type filter (coiffure, beaute, mixte)
    if (filters.salonType && filters.type !== 'shooting' && filters.type !== 'barber') {
      result = result.filter(s => s.salonType === filters.salonType)
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        s.description.toLowerCase().includes(searchLower) ||
        s.specialties.some(sp => sp.toLowerCase().includes(searchLower))
      )
    }

    // Neighborhood filter
    if (filters.neighborhood) {
      result = result.filter(s => s.neighborhood === filters.neighborhood)
    }

    // Category filter (based on specialties)
    if (filters.category) {
      result = result.filter(s => 
        s.specialties.some(sp => sp.toLowerCase().includes(filters.category.toLowerCase()))
      )
    }

    // Price range filter
    if (filters.priceRange) {
      result = result.filter(s => s.priceRange === filters.priceRange)
    }

    // Rating filter
    if (filters.minRating) {
      result = result.filter(s => s.rating >= parseFloat(filters.minRating))
    }

    // Sort
    switch (filters.sortBy) {
      case 'rating':
        result.sort((a, b) => b.rating - a.rating)
        break
      case 'reviews':
        result.sort((a, b) => b.reviewCount - a.reviewCount)
        break
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      default:
        break
    }

    return result
  }, [filters])

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    if (value) {
      searchParams.set(key, value)
    } else {
      searchParams.delete(key)
    }
    setSearchParams(searchParams)
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      neighborhood: '',
      category: '',
      priceRange: '',
      minRating: '',
      sortBy: 'rating',
      type: '',
      salonType: ''
    })
    setSearchParams({})
  }

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'rating').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30 pt-20 relative">
      {/* Global decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-40 right-10 w-[500px] h-[500px] bg-amber-200/50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-[400px] h-[400px] bg-yellow-200/40 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-orange-200/30 rounded-full blur-3xl"></div>
      </div>
      
      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 py-12 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-yellow-400/10 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Trouvez votre salon idéal
            </h1>
            <p className="text-primary-100 mb-6">
              {filteredSalons.length} établissement{filteredSalons.length > 1 ? 's' : ''} disponible{filteredSalons.length > 1 ? 's' : ''}
            </p>

            {/* Type toggle - Categories */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => { updateFilter('type', ''); updateFilter('salonType', ''); }}
                className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  filters.type === '' && filters.salonType === ''
                    ? 'bg-white text-gray-900 shadow-lg' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                ✨ Tous
              </button>
              <button
                onClick={() => { updateFilter('type', 'salon'); updateFilter('salonType', 'coiffure'); }}
                className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  filters.salonType === 'coiffure' 
                    ? 'bg-white text-gray-900 shadow-lg' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                💇‍♀️ Salons Coiffure
              </button>
              <button
                onClick={() => { updateFilter('type', 'salon'); updateFilter('salonType', 'beaute'); }}
                className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  filters.salonType === 'beaute' 
                    ? 'bg-white text-gray-900 shadow-lg' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                💅 Salons Beauté
              </button>
              <button
                onClick={() => { updateFilter('type', 'salon'); updateFilter('salonType', 'mixte'); }}
                className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  filters.salonType === 'mixte' 
                    ? 'bg-white text-gray-900 shadow-lg' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                💄 Coiffure & Beauté
              </button>
              <button
                onClick={() => { updateFilter('type', 'barber'); updateFilter('salonType', ''); }}
                className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  filters.type === 'barber' 
                    ? 'bg-white text-gray-900 shadow-lg' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                💈 Barbershops
              </button>
              <button
                onClick={() => { updateFilter('type', 'shooting'); updateFilter('salonType', ''); }}
                className={`flex items-center gap-1 px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  filters.type === 'shooting' 
                    ? 'bg-white text-gray-900 shadow-lg' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <FiCamera className="w-4 h-4" />
                Studios Photo
              </button>
            </div>

            {/* Search bar */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  placeholder="Rechercher un salon, un service..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-0 focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="relative">
                <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={filters.neighborhood}
                  onChange={(e) => updateFilter('neighborhood', e.target.value)}
                  className="w-full md:w-48 pl-12 pr-4 py-3 rounded-xl border-0 focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
                >
                  <option value="">Tous les quartiers</option>
                  {neighborhoods.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-medium transition-colors ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-white text-primary-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <FiFilter className="w-5 h-5" />
                <span>Filtres</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white border-b shadow-sm"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                <select
                  value={filters.category}
                  onChange={(e) => updateFilter('category', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Toutes</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Budget</label>
                <select
                  value={filters.priceRange}
                  onChange={(e) => updateFilter('priceRange', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous</option>
                  <option value="€">€ - Économique</option>
                  <option value="€€">€€ - Modéré</option>
                  <option value="€€€">€€€ - Premium</option>
                </select>
              </div>

              {/* Min Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Note minimum</label>
                <select
                  value={filters.minRating}
                  onChange={(e) => updateFilter('minRating', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Toutes</option>
                  <option value="4.5">⭐ 4.5+</option>
                  <option value="4">⭐ 4+</option>
                  <option value="3.5">⭐ 3.5+</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trier par</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilter('sortBy', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="rating">Mieux notés</option>
                  <option value="reviews">Plus d'avis</option>
                  <option value="name">Nom A-Z</option>
                </select>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-4 flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700"
              >
                <FiX className="w-4 h-4" />
                <span>Réinitialiser les filtres</span>
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Results */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredSalons.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiSearch className="w-12 h-12 text-primary-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun salon trouvé</h3>
            <p className="text-gray-500 mb-6">
              Essayez de modifier vos critères de recherche
            </p>
            <button
              onClick={clearFilters}
              className="btn-primary"
            >
              Réinitialiser les filtres
            </button>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSalons.map((salon, i) => (
              <SalonCard key={salon.id} salon={salon} index={i} />
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default Salons