import { motion } from 'framer-motion'
import { useMemo } from 'react'

function TimeSlot({ selectedTime, onTimeSelect, duration = 30 }) {
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

  return (
    <div className="rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Choisir un horaire</h3>
          <p className="text-xs text-gray-500">Durée estimée : {duration} min</p>
        </div>
        {selectedTime ? (
          <div className="text-xs text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
            {selectedTime}
          </div>
        ) : (
          <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Aucun créneau
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
        {timeSlots.map((time) => (
          <motion.button
            key={time}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onTimeSelect(time)}
            className={`
              py-2.5 px-2 sm:px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 border
              ${selectedTime === time 
                ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-500/25' 
                : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300 hover:text-primary-600'
              }
            `}
          >
            {time}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export default TimeSlot
