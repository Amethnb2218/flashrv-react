import { useState, useRef, useEffect, useMemo } from 'react'
import { FiSearch, FiMapPin, FiChevronDown, FiX, FiCheck } from 'react-icons/fi'
import { zones, allQuartiers } from '../../data/zones'

/**
 * QuartierSelector — searchable dropdown for neighborhoods
 * Props:
 *   value        — currently selected quartier string (or "")
 *   onChange      — (quartierName: string) => void
 *   placeholder   — placeholder text (default: "Tous les quartiers")
 *   className     — additional wrapper classes
 *   variant       — "default" | "form" (form = bordered input style)
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
  const listRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  // Focus search input when opening
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  // Filter zones & quartiers based on search
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
        // If zone name matches but no quartiers, show all quartiers of that zone
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
    ? 'w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 outline-none transition text-base bg-gray-50 text-left flex items-center justify-between gap-2'
    : 'w-full md:w-56 pl-10 pr-8 py-3 rounded-xl bg-white/95 shadow-sm border border-white/30 focus:ring-2 focus:ring-amber-400 focus:border-transparent text-left flex items-center justify-between gap-2 cursor-pointer'

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      {!isForm && (
        <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10 pointer-events-none" />
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={buttonClasses}
      >
        <span className={value ? 'text-gray-900 truncate' : 'text-gray-400 truncate'}>
          {value || placeholder}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
              className="p-0.5 rounded-full hover:bg-gray-200 transition"
            >
              <FiX className="w-3.5 h-3.5 text-gray-400" />
            </span>
          )}
          <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] max-w-[360px] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
          style={{ right: isForm ? undefined : 0 }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un quartier..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition bg-gray-50"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200"
                >
                  <FiX className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>
            {search && (
              <div className="text-xs text-gray-400 mt-1 px-1">
                {totalResults} résultat{totalResults !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Option: clear / all */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleSelect('')}
            onKeyDown={(e) => e.key === 'Enter' && handleSelect('')}
            className={`px-4 py-2.5 text-sm cursor-pointer flex items-center gap-2 transition ${
              !value ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FiMapPin className="w-4 h-4" />
            <span>{placeholder}</span>
            {!value && <FiCheck className="w-4 h-4 ml-auto text-amber-600" />}
          </div>

          {/* Scrollable list */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Aucun quartier trouvé pour « {search} »
              </div>
            ) : (
              filtered.map(z => (
                <div key={z.zone}>
                  {/* Zone header */}
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wide sticky top-0 border-t border-gray-100">
                    {z.zone}
                  </div>
                  {/* Quartiers in zone */}
                  {z.quartiers.map(q => (
                    <div
                      key={q}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelect(q)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSelect(q)}
                      className={`px-4 py-2 pl-6 text-sm cursor-pointer flex items-center gap-2 transition ${
                        value === q
                          ? 'bg-amber-50 text-amber-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{q}</span>
                      {value === q && <FiCheck className="w-4 h-4 ml-auto text-amber-600 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
