import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const PAGE_SIZE = 14

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function DatePicker({ selectedDate, onDateSelect, onSelect, isDateDisabled, daysToShow = 120 }) {
  const scrollRef = useRef(null)
  const [pageStart, setPageStart] = useState(0)

  const allDays = useMemo(() => {
    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const dateKey = toDateKey(date)
      const disabled = Boolean(isDateDisabled?.(dateKey))
      days.push({
        date: dateKey,
        dayName: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        dayNumber: date.getDate(),
        month: date.toLocaleDateString('fr-FR', { month: 'short' }),
        isToday: i === 0,
        disabled,
      })
    }

    return days
  }, [daysToShow, isDateDisabled])

  const handleSelect = onDateSelect || onSelect

  const selectedLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null

  useEffect(() => {
    if (!selectedDate || !allDays.length) return
    const selectedIndex = allDays.findIndex((d) => d.date === selectedDate)
    if (selectedIndex < 0) return
    const targetPage = Math.floor(selectedIndex / PAGE_SIZE) * PAGE_SIZE
    setPageStart(targetPage)
  }, [selectedDate, allDays])

  const visibleDays = allDays.slice(pageStart, pageStart + PAGE_SIZE)
  const canGoPrev = pageStart > 0
  const canGoNext = pageStart + PAGE_SIZE < allDays.length

  useEffect(() => {
    if (!selectedDate || !scrollRef.current) return
    const selectedButton = scrollRef.current.querySelector(`[data-date="${selectedDate}"]`)
    if (selectedButton) {
      selectedButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [selectedDate, pageStart])

  const pickFromOffset = (offsetDays) => {
    const idx = Math.min(Math.max(offsetDays, 0), allDays.length - 1)
    let candidate = idx

    while (candidate < allDays.length && allDays[candidate].disabled) {
      candidate += 1
    }

    if (candidate >= allDays.length) return

    const targetDate = allDays[candidate].date
    const targetPage = Math.floor(candidate / PAGE_SIZE) * PAGE_SIZE
    setPageStart(targetPage)
    handleSelect(targetDate)
  }

  return (
    <section className="w-full max-w-full overflow-hidden rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">Date</p>
        {selectedLabel && (
          <span className="max-w-[65%] truncate rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-700">
            {selectedLabel}
          </span>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setPageStart((v) => Math.max(v - PAGE_SIZE, 0))}
          disabled={!canGoPrev}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Dates precedentes"
        >
          <FiChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => pickFromOffset(1)}
            className="rounded-full border border-gray-200 px-2.5 py-1 text-gray-700 transition hover:bg-gray-50"
          >
            Demain
          </button>
          <button
            type="button"
            onClick={() => pickFromOffset(7)}
            className="rounded-full border border-gray-200 px-2.5 py-1 text-gray-700 transition hover:bg-gray-50"
          >
            +1 sem
          </button>
          <button
            type="button"
            onClick={() => pickFromOffset(14)}
            className="rounded-full border border-gray-200 px-2.5 py-1 text-gray-700 transition hover:bg-gray-50"
          >
            +2 sem
          </button>
          <button
            type="button"
            onClick={() => pickFromOffset(30)}
            className="rounded-full border border-gray-200 px-2.5 py-1 text-gray-700 transition hover:bg-gray-50"
          >
            +1 mois
          </button>
        </div>

        <button
          type="button"
          onClick={() => setPageStart((v) => Math.min(v + PAGE_SIZE, Math.max(allDays.length - PAGE_SIZE, 0)))}
          disabled={!canGoNext}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Dates suivantes"
        >
          <FiChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="relative w-full max-w-full overflow-hidden">
        <div
          ref={scrollRef}
          className="scrollbar-hide flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {visibleDays.map((day) => {
            const isSelected = selectedDate === day.date
            const isDisabled = day.disabled

            return (
              <motion.button
                key={day.date}
                data-date={day.date}
                whileTap={{ scale: isDisabled ? 1 : 0.97 }}
                onClick={() => {
                  if (isDisabled) return
                  handleSelect(day.date)
                }}
                disabled={isDisabled}
                className={`snap-start w-[78px] flex-shrink-0 rounded-2xl border px-2 py-2.5 text-center transition-all duration-200 ${
                  isDisabled
                    ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                    : isSelected
                    ? 'border-primary-500 bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'border-gray-200 bg-gray-50 text-gray-800 active:bg-gray-100'
                }`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected && !isDisabled ? 'text-primary-100' : 'text-gray-500'}`}>
                  {day.dayName}
                </p>
                <p className="mt-0.5 text-xl font-bold leading-none">{day.dayNumber}</p>
                <p className={`mt-1 text-[11px] ${isSelected && !isDisabled ? 'text-primary-100' : 'text-gray-500'}`}>{day.month}</p>
                {day.isToday && !isDisabled && (
                  <p className={`mt-1 text-[10px] font-semibold ${isSelected ? 'text-primary-100' : 'text-primary-600'}`}>Aujourd&apos;hui</p>
                )}
                {isDisabled && <p className="mt-1 text-[10px] font-semibold text-gray-400">Indispo</p>}
              </motion.button>
            )
          })}
        </div>
      </div>

      {!selectedDate && <p className="mt-2 text-center text-[11px] text-gray-500">Faites glisser, ou utilisez les fleches.</p>}
    </section>
  )
}

export default DatePicker

