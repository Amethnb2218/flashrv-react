import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FiSearch, FiMapPin, FiChevronDown, FiX, FiCheck } from 'react-icons/fi'
import { zones } from '../../data/zones'

/** Detect mobile vs desktop (below / at-or-above md breakpoint = 768px) */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e) => setIsMobile(!e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

/**
 * QuartierSelector — searchable dropdown for neighborhoods
 * On desktop: standard dropdown. On mobile: full-screen bottom sheet overlay.
 */
export default function QuartierSelector({
  value = '',
  onChange,
  placeholder = 'Tous les quartiers',
  className = '',
  variant = 'default'
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const isMobile = useIsMobile()

  // Lock body scroll when open on mobile
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [open])

  const dropdownRef = useRef(null)
  const mobileSheetRef = useRef(null)
  const [btnRect, setBtnRect] = useState(null)

  // Close on outside click — check container, desktop dropdown, AND mobile sheet
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      const inContainer = containerRef.current && containerRef.current.contains(e.target)
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target)
      const inMobileSheet = mobileSheetRef.current && mobileSheetRef.current.contains(e.target)
      if (!inContainer && !inDropdown && !inMobileSheet) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Track button position for desktop portal dropdown
  const updateBtnRect = useCallback(() => {
    if (containerRef.current) {
      setBtnRect(containerRef.current.getBoundingClientRect())
    }
  }, [])

  useEffect(() => {
    if (!open) return
    updateBtnRect()
    window.addEventListener('scroll', updateBtnRect, true)
    window.addEventListener('resize', updateBtnRect)
    return () => {
      window.removeEventListener('scroll', updateBtnRect, true)
      window.removeEventListener('resize', updateBtnRect)
    }
  }, [open, updateBtnRect])

  // Focus search when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return zones
    const s = search.toLowerCase().trim()
    return zones
      .map(z => ({
        ...z,
        quartiers: z.quartiers.filter(q => q.toLowerCase().includes(s))
      }))
      .filter(z => z.quartiers.length > 0 || z.zone.toLowerCase().includes(s))
      .map(z => {
        if (z.quartiers.length === 0 && z.zone.toLowerCase().includes(s)) {
          const original = zones.find(oz => oz.zone === z.zone)
          return { ...z, quartiers: original?.quartiers || [] }
        }
        return z
      })
  }, [search])

  const totalResults = filtered.reduce((sum, z) => sum + z.quartiers.length, 0)

  const handleSelect = (quartier) => {
    onChange(quartier)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
    setOpen(false)
    setSearch('')
  }

  const isForm = variant === 'form'

  const buttonClasses = isForm
    ? 'w-full px-3 py-2 rounded-lg border border-primary-300 focus:border-primary-500 outline-none transition text-base bg-primary-50 text-left flex items-center justify-between gap-2'
    : 'w-full md:w-56 pl-10 pr-8 py-3 rounded-xl bg-white/95 shadow-sm border border-white/30 focus:ring-2 focus:ring-gold-400 focus:border-transparent text-left flex items-center justify-between gap-2 cursor-pointer'

  // Shared list content
  const listContent = (
    <>
      {/* "All" option */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => handleSelect('')}
        onKeyDown={(e) => e.key === 'Enter' && handleSelect('')}
        className={`px-4 py-3 text-sm cursor-pointer flex items-center gap-2 transition active:bg-primary-100 ${
          !value ? 'bg-gold-50 text-gold-700 font-medium' : 'text-primary-600 hover:bg-primary-50'
        }`}
      >
        <FiMapPin className="w-4 h-4 flex-shrink-0" />
        <span>{placeholder}</span>
        {!value && <FiCheck className="w-4 h-4 ml-auto text-gold-600" />}
      </div>

      {filtered.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-primary-400">
          Aucun quartier trouvé pour « {search} »
        </div>
      ) : (
        filtered.map(z => (
          <div key={z.zone}>
            <div className="px-4 py-2 text-xs font-semibold text-primary-500 bg-primary-50 uppercase tracking-wide sticky top-0 border-t border-primary-100">
              {z.zone}
            </div>
            {z.quartiers.map(q => (
              <div
                key={q}
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(q)}
                onKeyDown={(e) => e.key === 'Enter' && handleSelect(q)}
                className={`px-4 py-3 pl-6 text-sm cursor-pointer flex items-center gap-2 transition active:bg-primary-100 ${
                  value === q
                    ? 'bg-gold-50 text-gold-700 font-medium'
                    : 'text-primary-700 hover:bg-primary-50'
                }`}
              >
                <span className="truncate">{q}</span>
                {value === q && <FiCheck className="w-4 h-4 ml-auto text-gold-600 flex-shrink-0" />}
              </div>
            ))}
          </div>
        ))
      )}
    </>
  )

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      {!isForm && (
        <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 w-5 h-5 z-10 pointer-events-none" />
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={buttonClasses}
      >
        <span className={value ? 'text-primary-900 truncate' : 'text-primary-400 truncate'}>
          {value || placeholder}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
              className="p-0.5 rounded-full hover:bg-primary-200 transition"
            >
              <FiX className="w-3.5 h-3.5 text-primary-400" />
            </span>
          )}
          <FiChevronDown className={`w-4 h-4 text-primary-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* ========== MOBILE: Bottom sheet ========== */}
      {open && isMobile && createPortal(
        <>
          {/* Backdrop */}
          <div
            onClick={() => { setOpen(false); setSearch('') }}
            style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: 'rgba(0,0,0,0.45)' }}
          />
          {/* Sheet */}
          <div
            ref={mobileSheetRef}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 9999,
              maxHeight: '65vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#fff',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, backgroundColor: '#cbd5e1' }} />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-primary-200" style={{ flexShrink: 0 }}>
              <h3 className="text-base font-semibold text-primary-900">Choisir un quartier</h3>
              <button
                type="button"
                onClick={() => { setOpen(false); setSearch('') }}
                className="p-2 -mr-2 rounded-full hover:bg-primary-100 transition"
              >
                <FiX className="w-5 h-5 text-primary-500" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-primary-100 bg-primary-50" style={{ flexShrink: 0 }}>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 w-4 h-4" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un quartier..."
                  className="w-full pl-9 pr-9 py-2.5 text-base rounded-xl border border-primary-200 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 outline-none transition bg-white"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-primary-200"
                  >
                    <FiX className="w-4 h-4 text-primary-400" />
                  </button>
                )}
              </div>
              {search && (
                <div className="text-xs text-primary-400 mt-1.5 px-1">
                  {totalResults} résultat{totalResults !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Scrollable list */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
              {listContent}
              <div style={{ height: 32 }} />
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ========== DESKTOP: Dropdown via portal ========== */}
      {open && !isMobile && btnRect && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            zIndex: 9999,
            width: 384,
            backgroundColor: '#fff',
            borderRadius: 12,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            ...(() => {
              const spaceBelow = window.innerHeight - btnRect.bottom - 12
              const spaceAbove = btnRect.top - 12
              const openAbove = spaceBelow < 280 && spaceAbove > spaceBelow
              const maxH = openAbove ? Math.min(spaceAbove, window.innerHeight * 0.6) : Math.min(spaceBelow, window.innerHeight * 0.6)
              return {
                ...(openAbove
                  ? { bottom: window.innerHeight - btnRect.top + 6 }
                  : { top: btnRect.bottom + 6 }),
                left: Math.min(btnRect.right - 384, window.innerWidth - 400),
                maxHeight: maxH,
                display: 'flex',
                flexDirection: 'column',
              }
            })(),
          }}
        >
          {/* Search input */}
          <div className="p-2.5 border-b border-primary-100 flex-shrink-0">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un quartier..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-primary-200 focus:border-gold-400 focus:ring-1 focus:ring-gold-400 outline-none transition bg-primary-50"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-primary-200"
                >
                  <FiX className="w-3 h-3 text-primary-400" />
                </button>
              )}
            </div>
            {search && (
              <div className="text-xs text-primary-400 mt-1 px-1">
                {totalResults} résultat{totalResults !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {listContent}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
