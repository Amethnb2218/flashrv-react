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
    <div>
      <h3 className="font-medium text-gray-900 mb-4">Créneaux disponibles</h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {timeSlots.map((time) => (
          <motion.button
            key={time}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onTimeSelect(time)}
            className={`
              py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200
              ${selectedTime === time 
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' 
                : 'bg-white border border-gray-200 text-gray-700 hover:border-primary-300 hover:text-primary-600'
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

