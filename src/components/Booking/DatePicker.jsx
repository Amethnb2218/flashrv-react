import { motion } from 'framer-motion'
import { useMemo, useRef, useEffect } from 'react'

function DatePicker({ selectedDate, onDateSelect, onSelect }) {
  const scrollRef = useRef(null)

  // Generate next 14 days
  const days = useMemo(() => {
    const result = []
    const today = new Date()
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      
      result.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        dayNumber: date.getDate(),
        month: date.toLocaleDateString('fr-FR', { month: 'short' }),
        isToday: i === 0
      })
    }
    
    return result
  }, [])

  // Auto-scroll to selected date
  useEffect(() => {
    if (!selectedDate || !scrollRef.current) return
    const idx = days.findIndex(d => d.date === selectedDate)
    if (idx < 0) return
    const btn = scrollRef.current.children[idx]
    if (btn) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedDate, days])

  // Support both prop names
  const handleSelect = onDateSelect || onSelect

  const selectedLabel = selectedDate
    ? new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : null

  return (
    <div className="rounded-2xl border border-gray-100 bg-white/80 p-3 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-900">📅 Choisir une date</h3>
        {selectedLabel && (
          <span className="text-xs text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full truncate max-w-[55%]">
            {selectedLabel}
          </span>
        )}
      </div>

      {/* Scroll container — full-bleed so edges are reachable */}
      <div className="relative -mx-3 sm:-mx-5">
        {/* Fade hints */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white/90 to-transparent z-10 rounded-l-2xl" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white/90 to-transparent z-10 rounded-r-2xl" />

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-2 px-4 sm:px-5 scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {days.map((day) => (
            <motion.button
              key={day.date}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(day.date)}
              className={`
                flex-shrink-0 w-[66px] sm:w-20 py-2.5 rounded-2xl text-center transition-all duration-200 border
                ${selectedDate === day.date
                  ? 'bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-500/25 scale-[1.03]'
                  : 'bg-white border-gray-200 text-gray-700 active:bg-gray-50'
                }
              `}
            >
              <div className={`text-[10px] uppercase tracking-wider font-medium ${selectedDate === day.date ? 'text-primary-200' : 'text-gray-400'}`}>
                {day.dayName}
              </div>
              <div className="text-xl font-bold mt-0.5">{day.dayNumber}</div>
              <div className={`text-[10px] ${selectedDate === day.date ? 'text-primary-200' : 'text-gray-400'}`}>
                {day.month}
              </div>
              {day.isToday && (
                <div className={`text-[9px] font-semibold mt-0.5 ${selectedDate === day.date ? 'text-white' : 'text-primary-600'}`}>
                  Auj.
                </div>
              )}
            </motion.button>
          ))}
          {/* Spacer so last item can scroll fully into view */}
          <div className="flex-shrink-0 w-2" aria-hidden />
        </div>
      </div>

      {!selectedDate && (
        <p className="text-xs text-gray-400 mt-2 text-center">← Faites glisser pour voir plus de dates →</p>
      )}
    </div>
  )
}

export default DatePicker
