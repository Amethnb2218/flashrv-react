import { categories } from '../../data/salons'
import SalonCard from '../../components/Salon/SalonCard'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { FiCamera, FiFilter, FiMapPin, FiSearch, FiShoppingBag, FiStar, FiX } from 'react-icons/fi'
import apiFetch from '@/api/client'
import QuartierSelector from '../../components/UI/QuartierSelector'
import { boutiqueCategoryOptions, getBoutiqueCategoryLabel, matchesBoutiqueCategory } from '../../utils/boutiqueCategories'

function Salons() {
  const normalizeFilterValue = (value) => String(value || '').trim().toLowerCase()
  const normalizeSearchText = (value) =>
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [showAllBoutiqueHeroCategories, setShowAllBoutiqueHeroCategories] = useState(false)
  const searchInputRef = useRef(null)
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    neighborhood: searchParams.get('neighborhood') || '',
    category: searchParams.get('category') || '',
    priceRange: searchParams.get('priceRange') || '',
    minRating: searchParams.get('minRating') || '',
    sortBy: searchParams.get('sortBy') || 'rating',
    type: searchParams.get('type') || '',
    salonType: searchParams.get('salonType') || '',
    businessType: searchParams.get('businessType') || '',
  })
  const [salons, setSalons] = useState([])
  const [loading, setLoading] = useState(true)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const urlBt = searchParams.get('businessType') || ''
    setFilters((prev) => {
      if (prev.businessType !== urlBt) {
        return { ...prev, businessType: urlBt, type: urlBt ? '' : prev.type, salonType: urlBt ? '' : prev.salonType }
      }
      return prev
    })

    if (searchParams.get('focus') === 'search') {
      searchParams.delete('focus')
      setSearchParams(searchParams, { replace: true })
      setTimeout(() => searchInputRef.current?.focus(), 300)
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const fetchSalons = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        params.set('limit', '300')
        const query = params.toString()
        const res = await apiFetch(`/salons${query ? `?${query}` : ''}`)
        const data = res?.data ?? res
        setSalons(data?.salons ?? res?.salons ?? [])
      } catch (_) {
        setSalons([])
      } finally {
        setLoading(false)
      }
    }

    fetchSalons()
  }, [])

  const filteredSalons = useMemo(() => {
    let result = [...salons].map((salon) => ({ ...salon, matchedProducts: [] }))
    const q = normalizeSearchText(filters.search)
    const activeBoutiqueCategory = String(filters.businessType || '').toUpperCase() === 'BOUTIQUE'
      ? String(filters.category || '').trim()
      : ''

    if (q || activeBoutiqueCategory) {
      result = result
        .map((s) => {
          const products = Array.isArray(s.products) ? s.products : []
          const matchedBySearch = q
            ? products.filter((product) => {
                if (!product || product.stock <= 0) return false
                const productHaystack = normalizeSearchText(
                  [
                    product.name,
                    product.description,
                    product.category,
                  ]
                    .filter(Boolean)
                    .join(' ')
                )
                return productHaystack.includes(q)
              })
            : []

          const matchedByCategory = activeBoutiqueCategory
            ? products.filter((product) => product && product.stock > 0 && matchesBoutiqueCategory(product, activeBoutiqueCategory))
            : []

          const mergedMatchedProducts = Array.from(
            new Map(
              [...matchedBySearch, ...matchedByCategory]
                .map((product, index) => [String(product?.id || `${product?.name || 'product'}-${index}`), product])
            ).values()
          )

          const haystack = normalizeSearchText(
            [
              s.name,
              s.description,
              s.city,
              s.address,
              s.neighborhood,
              s.zone,
              s.quartier,
              s.location,
            ]
              .filter(Boolean)
              .join(' ')
          )

          return {
            ...s,
            matchedProducts: mergedMatchedProducts,
            hasSearchMatch: !q || haystack.includes(q) || matchedBySearch.length > 0,
            hasCategoryMatch: !activeBoutiqueCategory || matchedByCategory.length > 0,
          }
        })
        .filter((s) => s.hasSearchMatch && s.hasCategoryMatch)
        .map(({ hasSearchMatch, hasCategoryMatch, ...salon }) => salon)
    }

    if (filters.neighborhood) {
      const neighborhood = normalizeSearchText(filters.neighborhood)
      result = result.filter((s) =>
        normalizeSearchText(s.neighborhood || s.address || '').includes(neighborhood) ||
        normalizeSearchText(s.city || '').includes(neighborhood)
      )
    }

    if (filters.category) {
      if (String(filters.businessType || '').toUpperCase() !== 'BOUTIQUE') {
        const category = filters.category.toLowerCase()
        result = result.filter(
          (s) => Array.isArray(s.services) && s.services.some((service) => String(service.category || '').toLowerCase().includes(category))
        )
      }
    }

    if (filters.type) {
      const wantedType = normalizeFilterValue(filters.type)
      result = result.filter((s) => {
        const typeValue = normalizeFilterValue(s.type)
        const salonTypeValue = normalizeFilterValue(s.salonType)
        const nameValue = normalizeFilterValue(s.name)

        if (wantedType === 'barber') {
          return (
            typeValue === 'barber' ||
            typeValue === 'barbershop' ||
            salonTypeValue === 'barber' ||
            salonTypeValue === 'barbershop' ||
            nameValue.includes('barber')
          )
        }

        if (wantedType === 'shooting') {
          return typeValue === 'shooting' || salonTypeValue === 'shooting'
        }

        if (wantedType === 'salon') {
          const businessType = String(s.businessType || 'SALON').trim().toUpperCase()
          return businessType !== 'BOUTIQUE'
        }

        return typeValue === wantedType
      })
    }

    if (filters.salonType) {
      const wantedSalonType = normalizeFilterValue(filters.salonType)
      result = result.filter((s) => {
        const salonTypeValue = normalizeFilterValue(s.salonType)
        const typeValue = normalizeFilterValue(s.type)

        if (wantedSalonType === 'coiffure') {
          return salonTypeValue === 'coiffure' || typeValue === 'barber' || salonTypeValue === 'barber'
        }
        if (wantedSalonType === 'beaute') {
          return salonTypeValue === 'beaute' || salonTypeValue === 'esthetique' || salonTypeValue === 'beauty'
        }
        if (wantedSalonType === 'mixte') {
          return salonTypeValue === 'mixte' || salonTypeValue === 'coiffure_beaute' || salonTypeValue === 'coiffure+beaute'
        }
        return salonTypeValue === wantedSalonType
      })
    }

    const normalizedBusinessType = String(filters.businessType || '').trim().toUpperCase()
    if (normalizedBusinessType) {
      result = result.filter((s) => String(s.businessType || 'SALON').trim().toUpperCase() === normalizedBusinessType)
    }

    if (filters.priceRange) {
      const getMinPrice = (salon) => {
        if (salon.minPrice) return salon.minPrice
        const prices = Array.isArray(salon.services) ? salon.services.map((service) => service?.price).filter(Boolean) : []
        return prices.length ? Math.min(...prices) : 0
      }

      const bucketFor = (salon) => {
        const min = getMinPrice(salon)
        if (min <= 5000) return 'low'
        if (min <= 15000) return 'mid'
        return 'high'
      }

      result = result.filter((s) => bucketFor(s) === filters.priceRange)
    }

    if (filters.minRating) {
      const minRating = Number(filters.minRating)
      result = result.filter((s) => (s.rating || 0) >= minRating)
    }

    switch (filters.sortBy) {
      case 'reviews':
        result.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
        break
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'rating':
      default:
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
    }

    return result
  }, [filters, salons])

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
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
      salonType: '',
      businessType: '',
    })
    setSearchParams({})
  }

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (!value || value === 'rating') return false
    if (key === 'businessType') return false
    return true
  }).length

  const activeChips = useMemo(() => {
    const chips = []
    if (filters.search) chips.push({ key: 'search', label: `Recherche: ${filters.search}` })
    if (filters.neighborhood) chips.push({ key: 'neighborhood', label: `Quartier: ${filters.neighborhood}` })
    const boutiqueModeActive = String(filters.businessType || '').toUpperCase() === 'BOUTIQUE'

    if (filters.category) {
      chips.push({
        key: 'category',
        label: `Categorie: ${boutiqueModeActive ? getBoutiqueCategoryLabel(filters.category) : filters.category}`,
      })
    }
    if (filters.priceRange) {
      const priceLabel =
        filters.priceRange === 'low'
          ? 'Budget: <= 5 000 F'
          : filters.priceRange === 'mid'
            ? 'Budget: 5 000 a 15 000 F'
            : 'Budget: >= 15 000 F'
      chips.push({ key: 'priceRange', label: priceLabel })
    }
    if (filters.minRating) chips.push({ key: 'minRating', label: `Note: ${filters.minRating}+` })
    if (filters.type) chips.push({ key: 'type', label: `Type: ${filters.type}` })
    if (filters.salonType) chips.push({ key: 'salonType', label: `Salon: ${filters.salonType}` })
    return chips
  }, [filters])

  const isBoutiqueMode = String(filters.businessType || '').toUpperCase() === 'BOUTIQUE'
  const listingTitle = isBoutiqueMode
    ? 'Trouvez votre boutique'
    : 'Trouvez votre salon idéal'
  const listingDescription = isBoutiqueMode
    ? 'Recherchez une boutique, une marque ou un produit, puis accédez rapidement a la bonne enseigne partenaire Jolof Era.'
    : 'Recherchez un salon, une prestation ou un quartier, comparez les profils vérifiés et trouvez rapidement le bon rendez-vous.'
  const boutiqueSignals = [
    'Produits coiffure et beaute',
    'Boutiques partenaires',
    'Commande rapide',
  ]
  const boutiqueSupportNotes = [
    { label: 'Recherche', value: 'Boutique ou produit' },
    { label: 'Zone', value: 'Quartier ou ville' },
  ]
  const boutiqueHeroCategories = [
    { id: '', label: 'Tous' },
    ...boutiqueCategoryOptions.map((item) => ({ id: item.id, label: item.label })),
  ]
  const initialBoutiqueHeroCategoryCount = 4
  const hiddenBoutiqueHeroCategories = boutiqueHeroCategories.slice(initialBoutiqueHeroCategoryCount)
  const hasHiddenBoutiqueHeroCategories = hiddenBoutiqueHeroCategories.length > 0
  const visibleBoutiqueHeroCategories = showAllBoutiqueHeroCategories
    ? boutiqueHeroCategories
    : boutiqueHeroCategories.slice(0, initialBoutiqueHeroCategoryCount)
  const resultsGridClass = isBoutiqueMode
    ? 'grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
    : 'grid gap-5 md:grid-cols-2 xl:grid-cols-3'

  useEffect(() => {
    if (
      hasHiddenBoutiqueHeroCategories &&
      hiddenBoutiqueHeroCategories.some((item) => item.id === String(filters.category || ''))
    ) {
      setShowAllBoutiqueHeroCategories(true)
    }
  }, [filters.category, hasHiddenBoutiqueHeroCategories, hiddenBoutiqueHeroCategories])

  const pillButton = (active) =>
    `w-full rounded-none px-3 py-2 text-xs font-semibold transition sm:text-sm ${
      active
        ? 'border border-[#e7cfaf] bg-[#fff8ee] text-[#4f3821] dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3]'
        : 'border border-[#e7cfaf] bg-[#fff8ee] text-[#4f3821] hover:bg-[#fff0de] dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:hover:bg-[#352214]'
    }`

  return (
    <div className="relative min-h-screen bg-[#fff7ec] text-[17px] dark:bg-[#1a120b]">

      <section className="relative z-10 page-shell pt-6 sm:pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.45 }}
          className="overflow-hidden rounded-none border border-[#e7cfaf] bg-[#fff8ee] text-[#2a1808] shadow-[0_24px_60px_-48px_rgba(157,79,13,0.16)] dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3]"
        >
          <div className="grid items-stretch gap-4 px-4 py-4 sm:px-6 sm:py-5 xl:grid-cols-[minmax(0,1fr)_520px] xl:px-7 xl:py-6">
            <div className="flex flex-col">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#a47e51] dark:text-[#cda675]">
                {isBoutiqueMode ? 'Boutiques partenaires' : 'Réservation beauté'}
              </p>
              <h1 className="mt-3 max-w-[15ch] font-display text-[1.9rem] leading-[0.95] tracking-[-0.045em] text-[#2a1808] sm:text-[2.35rem] lg:text-[2.8rem] dark:text-[#fff4e3]">
                {listingTitle}
              </h1>
              <p className="mt-3 max-w-[34rem] text-sm leading-6 text-[#7a6148] sm:text-[15px] dark:text-[#d6b081]">
                {listingDescription}
              </p>
              {isBoutiqueMode && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {boutiqueSignals.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center border border-[#e7cfaf] bg-[#fff8ee] px-3 py-2 text-xs font-medium text-[#2a1808] dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
              {isBoutiqueMode && (
                <div className="mt-4 overflow-hidden border border-[#e7cfaf] bg-[#fff8ee] shadow-[0_18px_40px_-34px_rgba(95,50,15,0.18)]">
                  <div className="aspect-[4/3] min-h-[260px] max-h-[420px] w-full overflow-hidden bg-[#fff4e4] sm:min-h-[320px]">
                    <img
                      src="https://i.pinimg.com/1200x/53/10/56/53105638f1c5e2b776f6249062d7900e.jpg"
                      alt="Boutique de vente de maillots et vetements"
                      className="h-full w-full object-cover object-center"
                      loading="eager"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}
              {!isBoutiqueMode && (
                <div className="mt-4 overflow-hidden border border-[#e7cfaf] bg-[#fff8ee] shadow-[0_18px_40px_-34px_rgba(95,50,15,0.18)]">
                  <div className="aspect-[4/3] min-h-[260px] w-full overflow-hidden bg-[#fff4e4] sm:min-h-[320px]">
                    <img
                      src="https://i.pinimg.com/1200x/7b/24/51/7b2451916e2724b4bfd1544c644d9d61.jpg"
                      alt="Photo de salon de coiffure"
                      className="h-full w-full object-cover object-center"
                      loading="eager"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="w-full overflow-hidden border border-[#e7cfaf] bg-[#fff8ee] p-3 backdrop-blur-sm xl:min-h-[450px] dark:border-[#7a5932] dark:bg-[#2b1b0f]">
              <div className="flex h-full min-h-[360px] flex-col bg-[#fff8ee] p-3 shadow-[0_18px_40px_-34px_rgba(95,50,15,0.18)] sm:min-h-[396px] dark:bg-[#2b1b0f]">
                <div className="flex flex-col gap-2.5">
                  <div className="relative flex-1">
                    <FiSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a47e51] dark:text-[#cda675]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={filters.search}
                      onChange={(e) => updateFilter('search', e.target.value)}
                      placeholder={filters.businessType === 'BOUTIQUE' ? 'Nom de boutique, produit, marque...' : 'Nom du salon, prestation, style...'}
                      className="w-full rounded-none border border-[#e7cfaf] bg-[#fffdf8] py-3.5 pl-12 pr-4 text-sm text-[#2a1808] outline-none transition placeholder:text-[#a47e51] focus:border-[#d97706] focus:bg-[#ffffff] dark:border-[#7a5932] dark:bg-[#352313] dark:text-[#fff4e3] dark:placeholder:text-[#d6b081] dark:focus:border-[#f0c77d]"
                    />
                  </div>
                  <div>
                    <QuartierSelector
                      value={filters.neighborhood}
                      onChange={(value) => updateFilter('neighborhood', value)}
                      variant={isBoutiqueMode ? 'hero' : 'default'}
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters((prev) => !prev)}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition ${
                      showFilters || activeFiltersCount > 0
                        ? 'border border-[#9d4f0d] bg-[#2a1808] text-[#fff4e3] shadow-sm dark:border-[#f0c77d] dark:bg-[#352313] dark:text-[#fff4e3]'
                        : 'border border-[#e7cfaf] bg-[#fff8ee] text-[#2a1808] hover:bg-[#fff0de] dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:hover:bg-[#352214]'
                    }`}
                  >
                    <FiFilter className="h-5 w-5" />
                    <span>Filtres</span>
                    {activeFiltersCount > 0 && (
                      <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-none bg-white/18 px-1 text-[10px] font-bold">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>
                {isBoutiqueMode ? (
                  <div className="mt-3 flex h-full flex-col gap-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {boutiqueSupportNotes.map((note) => (
                        <div
                          key={note.label}
                          className="border border-[#e7cfaf] bg-[#fff8ee] px-3 py-2.5 dark:border-[#7a5932] dark:bg-[#2b1b0f]"
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#a47e51] dark:text-[#cda675]">{note.label}</p>
                          <p className="mt-1 text-sm font-medium text-[#2a1808] dark:text-[#fff4e3]">{note.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 border border-[#e7cfaf] bg-[#fff8ee] p-3 dark:border-[#7a5932] dark:bg-[#2b1b0f]">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#a47e51] dark:text-[#cda675]">Categories</p>
                          <p className="mt-1 text-sm font-medium text-[#2a1808] dark:text-[#fff4e3]">Filtrez les boutiques par type d'articles</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {visibleBoutiqueHeroCategories.map((item) => {
                          const isActive = String(filters.category || '') === item.id
                          return (
                            <button
                              key={item.id || 'all-boutique-categories'}
                              type="button"
                              onClick={() => updateFilter('category', item.id)}
                              className={`w-full border px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                                isActive
                                  ? 'border-[#9d4f0d] bg-[#2a1808] text-[#fff4e3]'
                                  : 'border-[#e7cfaf] bg-[#fff8ee] text-[#4f3821] hover:bg-[#fff0de]'
                              }`}
                            >
                              {item.label}
                            </button>
                          )
                        })}
                      </div>
                      {hasHiddenBoutiqueHeroCategories && (
                        <button
                          type="button"
                          onClick={() => setShowAllBoutiqueHeroCategories((prev) => !prev)}
                          className="mt-3 inline-flex items-center justify-center border border-[#e7cfaf] bg-[#fff8ee] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4f3821] transition hover:bg-[#fff0de] sm:text-sm dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:hover:bg-[#352214]"
                        >
                          {showAllBoutiqueHeroCategories ? 'Voir moins' : 'Voir plus'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="w-full border border-[#e7cfaf] bg-[#fff8ee] p-2 dark:border-[#7a5932] dark:bg-[#2b1b0f]">
                      <div className="grid w-full grid-cols-2 gap-2">
                      <button
                        onClick={() => { updateFilter('type', ''); updateFilter('salonType', ''); updateFilter('businessType', 'SALON') }}
                        className={pillButton(filters.type === '' && filters.salonType === '' && String(filters.businessType || '').toUpperCase() !== 'BOUTIQUE')}
                      >
                        Tous
                      </button>
                      <button
                        onClick={() => { updateFilter('type', ''); updateFilter('salonType', 'coiffure'); updateFilter('businessType', 'SALON') }}
                        className={pillButton(filters.salonType === 'coiffure')}
                      >
                        Salons coiffure
                      </button>
                      <button
                        onClick={() => { updateFilter('type', ''); updateFilter('salonType', 'beaute'); updateFilter('businessType', 'SALON') }}
                        className={pillButton(filters.salonType === 'beaute')}
                      >
                        Salons beauté
                      </button>
                      <button
                        onClick={() => { updateFilter('type', ''); updateFilter('salonType', 'mixte'); updateFilter('businessType', 'SALON') }}
                        className={pillButton(filters.salonType === 'mixte')}
                      >
                        Coiffure & beauté
                      </button>
                      <button
                        onClick={() => { updateFilter('type', 'barber'); updateFilter('salonType', ''); updateFilter('businessType', 'SALON') }}
                        className={pillButton(filters.type === 'barber')}
                      >
                        Barbershops
                      </button>
                      <button
                        onClick={() => { updateFilter('type', 'shooting'); updateFilter('salonType', ''); updateFilter('businessType', 'SALON') }}
                        className={`${pillButton(filters.type === 'shooting')} col-span-2 inline-flex items-center justify-center gap-2`}
                      >
                        <FiCamera className="h-4 w-4" />
                        Studios photo
                      </button>
                    </div>
                  </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-[#e7cfaf] bg-[#fff8ee] px-5 py-3 sm:px-8 lg:px-10 dark:border-[#7a5932] dark:bg-[#2b1b0f]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#7a6148] dark:text-[#d6b081]">
                {isBoutiqueMode
                  ? `${filteredSalons.length} boutique${filteredSalons.length > 1 ? 's' : ''} partenaire${filteredSalons.length > 1 ? 's' : ''}`
                  : `${filteredSalons.length} établissement${filteredSalons.length > 1 ? 's' : ''} disponible${filteredSalons.length > 1 ? 's' : ''}`}
              </p>
              {activeChips.length > 0 && (
                <div className="flex max-w-full flex-wrap gap-2">
                  {activeChips.map((chip) => (
                    <button
                      key={`${chip.key}-${chip.label}`}
                      onClick={() => updateFilter(chip.key, '')}
                      className="inline-flex items-center gap-2 rounded-none border border-[#e7cfaf] bg-[#fff8ee] px-3 py-1.5 text-xs font-medium text-[#4f3821] transition hover:bg-[#fff0de] dark:border-[#7a5932] dark:bg-[#352214] dark:text-[#fff4e3] dark:hover:bg-[#3d2816]"
                    >
                      <span>{chip.label}</span>
                      <FiX className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            className="relative z-10 page-shell mt-4"
          >
            <div className="rounded-none border border-[#e7cfaf] bg-[#fff8ee]/95 p-5 shadow-[0_30px_90px_-60px_rgba(157,79,13,0.16)] backdrop-blur-sm dark:border-[#7a5932] dark:bg-[#2b1b0f]">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#4f3821] dark:text-[#f1d3aa]">Categorie</label>
                  <select
                    value={filters.category}
                    onChange={(e) => updateFilter('category', e.target.value)}
                    className="w-full rounded-none border border-[#e7cfaf] bg-[#fff0de] px-4 py-3 text-sm text-[#2a1808] outline-none focus:border-[#d97706] dark:border-[#7a5932] dark:bg-[#352313] dark:text-[#fff4e3]"
                  >
                    <option value="">Toutes</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#4f3821] dark:text-[#f1d3aa]">Budget</label>
                  <select
                    value={filters.priceRange}
                    onChange={(e) => updateFilter('priceRange', e.target.value)}
                    className="w-full rounded-none border border-[#e7cfaf] bg-[#fff0de] px-4 py-3 text-sm text-[#2a1808] outline-none focus:border-[#d97706] dark:border-[#7a5932] dark:bg-[#352313] dark:text-[#fff4e3]"
                  >
                    <option value="">Tous</option>
                    <option value="low">&lt;= 5 000 F</option>
                    <option value="mid">5 000 a 15 000 F</option>
                    <option value="high">&gt;= 15 000 F</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#4f3821] dark:text-[#f1d3aa]">Note minimum</label>
                  <select
                    value={filters.minRating}
                    onChange={(e) => updateFilter('minRating', e.target.value)}
                    className="w-full rounded-none border border-[#e7cfaf] bg-[#fff0de] px-4 py-3 text-sm text-[#2a1808] outline-none focus:border-[#d97706] dark:border-[#7a5932] dark:bg-[#352313] dark:text-[#fff4e3]"
                  >
                    <option value="">Toutes</option>
                    <option value="4.5">4.5+</option>
                    <option value="4">4+</option>
                    <option value="3.5">3.5+</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#4f3821] dark:text-[#f1d3aa]">Trier par</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilter('sortBy', e.target.value)}
                    className="w-full rounded-none border border-[#e7cfaf] bg-[#fff0de] px-4 py-3 text-sm text-[#2a1808] outline-none focus:border-[#d97706] dark:border-[#7a5932] dark:bg-[#352313] dark:text-[#fff4e3]"
                  >
                    <option value="rating">Mieux notes</option>
                    <option value="reviews">Plus d avis</option>
                    <option value="name">Nom A-Z</option>
                  </select>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center gap-2 rounded-none border border-[#e7cfaf] bg-[#fff0de] px-4 py-3 text-sm font-semibold text-[#4f3821] transition hover:bg-[#fff8ee] dark:border-[#7a5932] dark:bg-[#352313] dark:text-[#fff4e3] dark:hover:bg-[#3d2816]"
                >
                  <FiX className="h-4 w-4" />
                  Reinitialiser les filtres
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="relative z-10 page-shell py-8">
        {loading ? (
          <div className={resultsGridClass}>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-none border border-[#e7cfaf] bg-[#fff8ee]/92 p-5 shadow-[0_24px_70px_-55px_rgba(157,79,13,0.16)] backdrop-blur-sm dark:border-[#7a5932] dark:bg-[#2b1b0f]">
                <div className={`${isBoutiqueMode ? 'h-36 sm:h-40' : 'h-52'} animate-pulse rounded-none bg-[#ffe7c4] dark:bg-[#352214]`}></div>
                <div className="mt-4 h-5 w-2/3 animate-pulse rounded-none bg-[#ffe7c4] dark:bg-[#352214]"></div>
                <div className="mt-3 h-4 w-1/2 animate-pulse rounded-none bg-[#ffe7c4] dark:bg-[#352214]"></div>
              </div>
            ))}
          </div>
        ) : filteredSalons.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-none border border-[#e7cfaf] bg-[#fff8ee]/95 px-6 py-10 text-center shadow-[0_30px_90px_-60px_rgba(157,79,13,0.16)] backdrop-blur-sm dark:border-[#7a5932] dark:bg-[#2b1b0f]"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-none bg-[#fff0de] dark:bg-[#352214]">
              <FiSearch className="h-10 w-10 text-[#a47e51] dark:text-[#cda675]" />
            </div>
            <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#2a1808] dark:text-[#fff4e3]">
              {isBoutiqueMode ? 'Aucune boutique trouvee' : 'Aucun resultat'}
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#7a6148] dark:text-[#d6b081]">
              {isBoutiqueMode
                ? 'Essaie une autre recherche, change de quartier ou retire quelques filtres pour afficher plus de boutiques partenaires.'
                : 'Essaie un autre quartier, une categorie differente ou retire quelques filtres pour elargir la recherche.'}
            </p>
            <button
              onClick={clearFilters}
              className="mt-6 inline-flex items-center gap-2 rounded-none border border-transparent bg-[#9d4f0d] px-5 py-3 text-sm font-semibold text-[#fff4e3] transition hover:bg-[#7b3f10] dark:border-[#f0c77d] dark:bg-[#ffd978] dark:text-[#2a1808] dark:hover:bg-[#f5c25a]"
            >
              Reinitialiser
            </button>
          </motion.div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-4 rounded-none border border-[#e7cfaf] bg-[#fff8ee]/82 px-5 py-4 backdrop-blur-sm dark:border-[#7a5932] dark:bg-[#2b1b0f] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#a47e51] dark:text-[#cda675]">Selection</p>
                <p className="mt-2 text-sm text-[#7a6148] dark:text-[#d6b081]">
                  {isBoutiqueMode
                    ? 'Une lecture plus dense pour comparer rapidement les boutiques, les quartiers et les prix d entree.'
                    : 'Une grille plus claire pour comparer rapidement les salons, les avis et les disponibilites.'}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-none bg-[#fff0de] px-3 py-2 text-sm font-semibold text-[#4f3821] dark:bg-[#352214] dark:text-[#fff4e3]">
                <FiStar className="h-4 w-4 text-[#a47e51] dark:text-[#ffd978]" />
                {filters.sortBy === 'reviews' ? 'Tri par avis' : filters.sortBy === 'name' ? 'Tri alphabetique' : 'Tri par note'}
              </div>
            </div>

            <div className={resultsGridClass}>
              {filteredSalons.map((salon, index) => (
                <SalonCard
                  key={salon.id}
                  salon={salon}
                  index={index}
                  variant={isBoutiqueMode ? 'featured' : 'list'}
                  compact={isBoutiqueMode}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default Salons



