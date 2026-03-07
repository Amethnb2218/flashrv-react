import { motion } from 'framer-motion'
import { useMemo, useRef, useEffect } from 'react'

function DatePicker({ selectedDate, onDateSelect, onSelect }) {
  const scrollRef = useRef(null)

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

  useEffect(() => {
    if (!selectedDate || !scrollRef.current) return
    const idx = days.findIndex(d => d.date === selectedDate)
    if (idx < 0) return
    const btn = scrollRef.current.children[idx]
    if (btn) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedDate, days])

  const handleSelect = onDateSelect || onSelect

  const selectedLabel = selectedDate
    ? new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : null

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <p className="text-[13px] font-semibold text-gray-800 flex items-center gap-1.5">
          📅 <span>Choisir une date</span>
        </p>
        {selectedLabel && (
          <span className="text-[11px] font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full truncate max-w-[50%]">
            {selectedLabel}
          </span>
        )}
      </div>

      {/* Horizontally scrollable date strip */}
      <div className="relative -mx-3 sm:-mx-6">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-l from-white to-transparent z-10" />

        <div
          ref={scrollRef}
          className="flex gap-1.5 overflow-x-auto py-1 px-4 sm:px-6 scrollbar-hide snap-x snap-mandatory"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {days.map((day) => {
            const isSelected = selectedDate === day.date
            return (
              <motion.button
                key={day.date}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleSelect(day.date)}
                className={`
                  snap-center flex-shrink-0 w-[58px] py-2 rounded-xl text-center transition-all duration-200 border
                  ${isSelected
                    ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-500/30 scale-105'
                    : 'bg-gray-50 border-gray-100 text-gray-700 active:bg-gray-100'
                  }
                `}
              >
                <div className={`text-[9px] uppercase tracking-widest font-semibold ${isSelected ? 'text-primary-200' : 'text-gray-400'}`}>
                  {day.dayName}
                </div>
                <div className="text-lg font-bold leading-tight mt-0.5">{day.dayNumber}</div>
                <div className={`text-[9px] leading-tight ${isSelected ? 'text-primary-200' : 'text-gray-400'}`}>
                  {day.month}
                </div>
                {day.isToday && (
                  <div className={`w-1 h-1 rounded-full mx-auto mt-1 ${isSelected ? 'bg-white' : 'bg-primary-500'}`} />
                )}
              </motion.button>
            )
          })}
          <div className="flex-shrink-0 w-3" aria-hidden />
        </div>
      </div>

      {!selectedDate && (
        <p className="text-[11px] text-gray-400 mt-2 text-center select-none">
          ← Glissez pour voir plus →
        </p>
      )}
    </div>
  )
}

export default DatePicker
