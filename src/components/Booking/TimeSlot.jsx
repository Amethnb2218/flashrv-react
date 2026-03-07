import { motion } from 'framer-motion'
import { useMemo, useRef, useEffect, useState } from 'react'

function TimeSlot({ selectedTime, onTimeSelect, duration = 30 }) {
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

  const periods = useMemo(() => [
    { id: 'matin', label: 'Matin', emoji: '🌅', range: '8h–12h', slots: timeSlots.filter(t => parseInt(t) < 12) },
    { id: 'aprem', label: 'Après-midi', emoji: '☀️', range: '12h–17h', slots: timeSlots.filter(t => parseInt(t) >= 12 && parseInt(t) < 17) },
    { id: 'soir', label: 'Soir', emoji: '🌙', range: '17h–20h', slots: timeSlots.filter(t => parseInt(t) >= 17) },
  ], [timeSlots])

  // Auto-select active period based on selected time or default to first
  useEffect(() => {
    if (selectedTime) {
      const hour = parseInt(selectedTime)
      if (hour < 12) setActivePeriod('matin')
      else if (hour < 17) setActivePeriod('aprem')
      else setActivePeriod('soir')
    } else if (!activePeriod) {
      setActivePeriod('matin')
    }
  }, [selectedTime])

  useEffect(() => {
    if (!selectedTime || !scrollRef.current) return
    const el = scrollRef.current.querySelector(`[data-time="${selectedTime}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedTime])

  const currentPeriod = periods.find(p => p.id === activePeriod) || periods[0]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-[13px] font-semibold text-gray-800 flex items-center gap-1.5">
          🕐 <span>Choisir un horaire</span>
        </p>
        {selectedTime && (
          <span className="text-[12px] font-bold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full">
            {selectedTime}
          </span>
        )}
      </div>

      {/* Period tabs — pill-style, horizontally scrollable on tiny screens */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
        {periods.map((period) => {
          const isActive = activePeriod === period.id
          const hasSelected = selectedTime && period.slots.includes(selectedTime)
          return (
            <button
              key={period.id}
              onClick={() => setActivePeriod(period.id)}
              className={`
                flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-xs font-semibold transition-all border
                ${isActive
                  ? 'bg-primary-600 text-white border-primary-500 shadow-md shadow-primary-500/20'
                  : hasSelected
                  ? 'bg-primary-50 text-primary-700 border-primary-200'
                  : 'bg-gray-50 text-gray-500 border-gray-100 active:bg-gray-100'
                }
              `}
            >
              <span className="text-sm">{period.emoji}</span>
              <span className="truncate">{period.label}</span>
            </button>
          )
        })}
      </div>

      {/* Time slots grid — 3 cols mobile, 4 cols larger */}
      <div ref={scrollRef} className="max-h-[40vh] overflow-y-auto scrollbar-hide rounded-xl" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5">
          {currentPeriod.slots.map((time) => {
            const isSelected = selectedTime === time
            return (
              <motion.button
                key={time}
                data-time={time}
                whileTap={{ scale: 0.9 }}
                onClick={() => onTimeSelect(time)}
                className={`
                  py-2.5 rounded-xl font-semibold text-[13px] transition-all duration-150 border text-center
                  ${isSelected
                    ? 'bg-primary-600 text-white border-primary-500 shadow-lg shadow-primary-500/25 scale-105'
                    : 'bg-gray-50 border-gray-100 text-gray-700 active:bg-gray-100'
                  }
                `}
              >
                {time}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Duration info */}
      <p className="text-[11px] text-gray-400 mt-2.5 text-center">
        Durée estimée : <span className="font-medium text-gray-500">{duration} min</span>
      </p>
    </div>
  )
}

export default TimeSlot
