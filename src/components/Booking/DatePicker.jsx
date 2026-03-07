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
        isToday: i === 0,
      })
    }

    return result
  }, [])

  useEffect(() => {
    if (!selectedDate || !scrollRef.current) return
    const idx = days.findIndex((d) => d.date === selectedDate)
    if (idx < 0) return
    const button = scrollRef.current.children[idx]
    if (button) button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedDate, days])

  const handleSelect = onDateSelect || onSelect

  const selectedLabel = selectedDate
    ? new Date(selectedDate).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">Date</p>
        {selectedLabel && (
          <span className="max-w-[65%] truncate rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-700">
            {selectedLabel}
          </span>
        )}
      </div>

      <div className="relative -mx-3 sm:-mx-4">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-6 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-6 bg-gradient-to-l from-white to-transparent" />

        <div
          ref={scrollRef}
          className="scrollbar-hide flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-1 sm:px-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {days.map((day) => {
            const isSelected = selectedDate === day.date

            return (
              <motion.button
                key={day.date}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleSelect(day.date)}
                className={`snap-start min-w-[76px] flex-shrink-0 rounded-2xl border px-2.5 py-2.5 text-center transition-all duration-200 ${
                  isSelected
                    ? 'border-primary-500 bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'border-gray-200 bg-gray-50 text-gray-800 active:bg-gray-100'
                }`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? 'text-primary-100' : 'text-gray-500'}`}>
                  {day.dayName}
                </p>
                <p className="mt-0.5 text-xl font-bold leading-none">{day.dayNumber}</p>
                <p className={`mt-1 text-[11px] ${isSelected ? 'text-primary-100' : 'text-gray-500'}`}>{day.month}</p>
                {day.isToday && (
                  <p className={`mt-1 text-[10px] font-semibold ${isSelected ? 'text-primary-100' : 'text-primary-600'}`}>
                    Aujourd&apos;hui
                  </p>
                )}
              </motion.button>
            )
          })}
          <div className="w-1 flex-shrink-0" aria-hidden />
        </div>
      </div>

      {!selectedDate && <p className="mt-2 text-center text-[11px] text-gray-500">Faites glisser pour voir les prochains jours.</p>}
    </section>
  )
}

export default DatePicker
