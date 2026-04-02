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
 * QuartierSelector â€” searchable dropdown for neighborhoods
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
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'))
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setIsDarkMode(root.classList.contains('dark'))
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

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

  // Close on outside click â€” check container, desktop dropdown, AND mobile sheet
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
  const isHero = variant === 'hero'

  const buttonClasses = isForm
    ? 'w-full px-3 py-2 rounded-lg border border-primary-300 focus:border-primary-500 outline-none transition text-base bg-primary-50 text-left flex items-center justify-between gap-2 dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3]'
    : isHero
      ? 'w-full pl-10 pr-8 py-3 rounded-none border border-[#ead7ba] bg-white text-left flex items-center justify-between gap-2 cursor-pointer text-primary-900 transition focus:border-[#d97706] focus:ring-2 focus:ring-[#f5a133]/20 dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:focus:border-[#f0c77d] dark:focus:ring-[#ffd978]/10'
      : 'w-full md:w-56 pl-10 pr-8 py-3 rounded-xl bg-white shadow-sm border border-[#ead7ba] focus:ring-2 focus:ring-gold-400 focus:border-transparent text-left flex items-center justify-between gap-2 cursor-pointer dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3]'

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
          !value
            ? 'bg-primary-100 text-primary-900 font-medium dark:border dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3]'
            : 'text-primary-600 hover:bg-primary-50 dark:text-[#f1d3aa] dark:hover:bg-[#352214]'
        }`}
      >
        <FiMapPin className="w-4 h-4 flex-shrink-0" />
        <span>{placeholder}</span>
        {!value && <FiCheck className="w-4 h-4 ml-auto text-primary-700 dark:text-[#ffd978]" />}
      </div>

      {filtered.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-primary-400 dark:text-[#d6b081]">
          Aucun quartier trouvé pour « {search} »
        </div>
      ) : (
        filtered.map(z => (
          <div key={z.zone}>
            <div className="sticky top-0 border-t border-primary-100 bg-primary-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary-500 dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#cda675]">
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
                    ? 'bg-primary-100 text-primary-900 font-medium dark:border dark:border-[#7a5932] dark:bg-[#2b1b0f] dark:text-[#fff4e3]'
                    : 'text-primary-700 hover:bg-primary-50 dark:text-[#f1d3aa] dark:hover:bg-[#352214]'
                }`}
              >
                <span className="truncate">{q}</span>
                {value === q && <FiCheck className="w-4 h-4 ml-auto text-primary-700 dark:text-[#ffd978] flex-shrink-0" />}
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
        <FiMapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-primary-400 dark:text-[#cda675]" />
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={buttonClasses}
      >
        <span className={value ? 'truncate text-primary-900 dark:text-[#fff4e3]' : 'truncate text-primary-400 dark:text-[#cda675]'}>
          {value || placeholder}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
              className={`${isHero ? 'rounded-none p-1' : 'rounded-full p-0.5'} transition hover:bg-primary-200 dark:hover:bg-[#352214]`}
            >
              <FiX className="h-3.5 w-3.5 text-primary-400 dark:text-[#cda675]" />
            </span>
          )}
          <FiChevronDown className={`h-4 w-4 text-primary-400 transition-transform dark:text-[#cda675] ${open ? 'rotate-180' : ''}`} />
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
              backgroundColor: isDarkMode ? '#2b1b0f' : '#ffffff',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
              border: isDarkMode ? '1px solid #7a5932' : '1px solid #ead7ba',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, backgroundColor: isDarkMode ? '#6d5030' : '#dec7a4' }} />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-primary-200 px-4 py-2 dark:border-[#62462a]" style={{ flexShrink: 0 }}>
              <h3 className="text-base font-semibold text-primary-900 dark:text-[#fff4e3]">Choisir un quartier</h3>
              <button
                type="button"
                onClick={() => { setOpen(false); setSearch('') }}
                className={`-mr-2 ${isHero ? 'rounded-none' : 'rounded-full'} p-2 transition hover:bg-primary-100 dark:hover:bg-[#352214]`}
              >
                <FiX className="h-5 w-5 text-primary-500 dark:text-[#cda675]" />
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-primary-100 bg-primary-50 px-4 py-3 dark:border-[#7a5932] dark:bg-[#2b1b0f]" style={{ flexShrink: 0 }}>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-400 dark:text-[#cda675]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un quartier..."
                  className={`w-full ${isHero ? 'rounded-none border-[#ead7ba] focus:border-[#d97706] focus:ring-[#f5a133]/20' : 'rounded-xl border-primary-200 focus:border-gold-400 focus:ring-gold-400/20'} border bg-white py-2.5 pl-9 pr-9 text-base outline-none transition dark:border-[#7a5932] dark:bg-[#352313] dark:text-[#fff4e3] dark:placeholder:text-[#cda675] dark:focus:border-[#f0c77d] dark:focus:ring-[#ffd978]/10`}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 ${isHero ? 'rounded-none' : 'rounded-full'} p-1 hover:bg-primary-200 dark:hover:bg-[#352214]`}
                  >
                    <FiX className="h-4 w-4 text-primary-400 dark:text-[#cda675]" />
                  </button>
                )}
              </div>
              {search && (
                <div className="mt-1.5 px-1 text-xs text-primary-400 dark:text-[#cda675]">
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
            backgroundColor: isDarkMode ? '#2b1b0f' : '#ffffff',
            borderRadius: 12,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: isDarkMode ? '1px solid #7a5932' : '1px solid #ead7ba',
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
          <div className="border-b border-primary-100 p-2.5 flex-shrink-0 dark:border-[#7a5932]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-400 dark:text-[#cda675]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un quartier..."
                className="w-full rounded-lg border border-primary-200 bg-primary-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-gold-400 focus:ring-1 focus:ring-gold-400 dark:border-[#7a5932] dark:bg-[#352313] dark:text-[#fff4e3] dark:placeholder:text-[#cda675]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-primary-200 dark:hover:bg-[#352214]"
                >
                  <FiX className="h-3 w-3 text-primary-400 dark:text-[#cda675]" />
                </button>
              )}
            </div>
            {search && (
              <div className="mt-1 px-1 text-xs text-primary-400 dark:text-[#cda675]">
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

