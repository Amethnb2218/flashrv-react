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

  const selectedLabel = selectedDate
    ? new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    : null

  return (
    <div className="rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Choisir une date</h3>
          <p className="text-xs text-gray-500">14 prochains jours disponibles</p>
        </div>
        <div className="text-xs text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
          {selectedLabel || 'Aucune date'}
        </div>
      </div>
      <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
        {days.map((day) => (
          <motion.button
            key={day.date}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect(day.date)}
            className={`
              flex-shrink-0 w-20 px-3 py-3 rounded-2xl text-center transition-all duration-200 border
              ${selectedDate === day.date
                ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300'
              }
            `}
          >
            <div className={`text-[11px] uppercase tracking-wide ${selectedDate === day.date ? 'text-primary-100' : 'text-gray-500'}`}>
              {day.dayName}
            </div>
            <div className="text-2xl font-bold mt-1">{day.dayNumber}</div>
            <div className={`text-[11px] ${selectedDate === day.date ? 'text-primary-100' : 'text-gray-500'}`}>
              {day.month}
            </div>
            {day.isToday && (
              <div className={`text-[11px] mt-1 ${selectedDate === day.date ? 'text-white' : 'text-primary-600'}`}>
                Aujourd'hui
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export default DatePicker
