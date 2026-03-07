import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FiClock, FiMoon, FiSun, FiSunset } from 'react-icons/fi'

function TimeSlot({
  selectedDate,
  selectedTime,
  onTimeSelect,
  duration = 30,
  isDateUnavailable,
  getNextAvailableDate,
  onDateSelect,
}) {
  const scrollRef = useRef(null)
  const [activePeriod, setActivePeriod] = useState(null)

  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 8; hour < 20; hour++) {
      for (let min = 0; min < 60; min += 30) {
        slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`)
      }
    }
    return slots
  }, [])

  const periods = useMemo(
    () => [
      {
        id: 'matin',
        label: 'Matin',
        range: '08:00 - 11:30',
        Icon: FiSun,
        slots: timeSlots.filter((t) => parseInt(t, 10) < 12),
      },
      {
        id: 'aprem',
        label: 'Apres-midi',
        range: '12:00 - 16:30',
        Icon: FiSunset,
        slots: timeSlots.filter((t) => parseInt(t, 10) >= 12 && parseInt(t, 10) < 17),
      },
      {
        id: 'soir',
        label: 'Soir',
        range: '17:00 - 19:30',
        Icon: FiMoon,
        slots: timeSlots.filter((t) => parseInt(t, 10) >= 17),
      },
    ],
    [timeSlots]
  )

  useEffect(() => {
    if (selectedTime) {
      const hour = parseInt(selectedTime, 10)
      if (hour < 12) setActivePeriod('matin')
      else if (hour < 17) setActivePeriod('aprem')
      else setActivePeriod('soir')
      return
    }
    if (!activePeriod) {
      setActivePeriod('matin')
    }
  }, [selectedTime, activePeriod])

  useEffect(() => {
    if (!selectedTime || !scrollRef.current) return
    const el = scrollRef.current.querySelector(`[data-time="${selectedTime}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedTime])

  const currentPeriod = periods.find((p) => p.id === activePeriod) || periods[0]
  const dateUnavailable = Boolean(selectedDate && isDateUnavailable?.(selectedDate))
  const hasSlots = !dateUnavailable && currentPeriod.slots.length > 0
  const nextDate = dateUnavailable ? getNextAvailableDate?.(selectedDate) : null

  return (
    <section className="box-border w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">Heure</p>
        {selectedTime && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
            <FiClock className="h-3.5 w-3.5" />
            {selectedTime}
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {periods.map((period) => {
          const isActive = activePeriod === period.id
          const hasSelected = selectedTime && period.slots.includes(selectedTime)

          return (
            <button
              key={period.id}
              onClick={() => setActivePeriod(period.id)}
              className={`min-w-0 flex-1 rounded-xl border px-1.5 py-2 text-center transition-all sm:px-2 ${
                isActive
                  ? 'border-primary-500 bg-primary-600 text-white shadow-md shadow-primary-500/20'
                  : hasSelected
                  ? 'border-primary-200 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700 active:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <period.Icon className="h-4 w-4" />
                <span className="text-[13px] font-semibold">{period.label}</span>
              </div>
              <p className={`mt-1 text-[10px] ${isActive ? 'text-primary-100' : 'text-gray-500'}`}>{period.range}</p>
            </button>
          )
        })}
      </div>

      {!hasSlots ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          <p className="font-medium">Aucun creneau disponible pour cette date.</p>
          {nextDate ? (
            <button
              type="button"
              onClick={() => onDateSelect?.(nextDate)}
              className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
            >
              Prochaine date disponible: {new Date(`${nextDate}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </button>
          ) : null}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="max-h-[42vh] w-full max-w-full overflow-x-hidden overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/60 p-2"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(72px,1fr))] gap-2 sm:grid-cols-[repeat(auto-fit,minmax(90px,1fr))] sm:gap-2.5">
            {currentPeriod.slots.map((time) => {
              const isSelected = selectedTime === time

              return (
                <motion.button
                  key={time}
                  data-time={time}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onTimeSelect(time)}
                  className={`w-full min-w-0 rounded-xl border py-2.5 text-center text-sm font-semibold transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-600 text-white shadow-md shadow-primary-500/25'
                      : 'border-gray-200 bg-white text-gray-800 active:bg-gray-100'
                  }`}
                >
                  {time}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      <p className="mt-2 text-center text-xs text-gray-500">Duree estimee: {duration} min</p>
    </section>
  )
}

export default TimeSlot

