import { motion } from 'framer-motion'
import { useMemo } from 'react'

function DatePicker({ selectedDate, onDateSelect, onSelect }) {
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

  // Support both prop names
  const handleSelect = onDateSelect || onSelect

  return (
    <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
      {days.map((day) => (
        <motion.button
          key={day.date}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSelect(day.date)}
          className={`
            flex-shrink-0 w-16 py-3 rounded-xl text-center transition-all duration-200
            ${selectedDate === day.date
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
              : 'bg-white border border-gray-200 text-gray-700 hover:border-primary-300'
            }
          `}
        >
          <div className={`text-xs uppercase ${selectedDate === day.date ? 'text-primary-200' : 'text-gray-500'}`}>
            {day.dayName}
          </div>
          <div className="text-xl font-bold mt-1">{day.dayNumber}</div>
          <div className={`text-xs ${selectedDate === day.date ? 'text-primary-200' : 'text-gray-500'}`}>
            {day.month}
          </div>
          {day.isToday && (
            <div className={`text-xs mt-1 ${selectedDate === day.date ? 'text-white' : 'text-primary-600'}`}>
              Auj.
            </div>
          )}
        </motion.button>
      ))}
    </div>
  )
}

export default DatePicker

