import { motion } from 'framer-motion'
import { useMemo, useRef, useEffect } from 'react'

function TimeSlot({ selectedTime, onTimeSelect, duration = 30 }) {
  const scrollRef = useRef(null)

  // Generate time slots from 8:00 to 20:00
  const timeSlots = useMemo(() => {
    const slots = []
    const startHour = 8
    const endHour = 20
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    
    return slots
  }, [])

  // Group time slots by period for easier visual scanning
  const periods = useMemo(() => {
    return [
      { label: 'Matin', emoji: '🌅', slots: timeSlots.filter(t => parseInt(t) < 12) },
      { label: 'Après-midi', emoji: '☀️', slots: timeSlots.filter(t => parseInt(t) >= 12 && parseInt(t) < 17) },
      { label: 'Soir', emoji: '🌙', slots: timeSlots.filter(t => parseInt(t) >= 17) },
    ]
  }, [timeSlots])

  // Auto-scroll to selected time period
  useEffect(() => {
    if (!selectedTime || !scrollRef.current) return
    const el = scrollRef.current.querySelector(`[data-time="${selectedTime}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedTime])

  return (
    <div className="rounded-2xl border border-gray-100 bg-white/80 p-3 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-900">🕐 Choisir un horaire</h3>
        {selectedTime ? (
          <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full">
            {selectedTime}
          </span>
        ) : (
          <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
            Aucun créneau
          </span>
        )}
      </div>

      <div ref={scrollRef} className="space-y-4 max-h-[50vh] overflow-y-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {periods.map((period) => (
          <div key={period.label}>
            <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
              <span>{period.emoji}</span> {period.label}
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2">
              {period.slots.map((time) => (
                <motion.button
                  key={time}
                  data-time={time}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => onTimeSelect(time)}
                  className={`
                    py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 border text-center
                    ${selectedTime === time 
                      ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/25' 
                      : 'bg-white border-gray-200 text-gray-700 active:bg-gray-50'
                    }
                  `}
                >
                  {time}
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        Durée estimée : {duration} min
      </p>
    </div>
  )
}

export default TimeSlot
