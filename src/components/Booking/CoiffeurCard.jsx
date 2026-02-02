import { FiCheck, FiStar } from 'react-icons/fi'
import { motion } from 'framer-motion'

function CoiffeurCard({ coiffeur, isSelected, onSelect }) {
  // Get initials from name
  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'C'
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`
        p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'border-primary-500 bg-primary-50 shadow-lg shadow-primary-500/20' 
          : 'border-gray-200 hover:border-primary-300 bg-white hover:shadow-md'
        }
      `}
    >
      <div className="flex items-center space-x-4">
        <div className="relative">
          {/* Initials circle instead of photo */}
          <div className={`
            w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg
            ${isSelected 
              ? 'bg-primary-600 text-white' 
              : 'bg-gradient-to-br from-primary-500 to-accent-500 text-white'
            }
          `}>
            {getInitials(coiffeur.name)}
          </div>
          {isSelected && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <FiCheck className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold truncate ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
            {coiffeur.name}
          </h4>
          <p className="text-sm text-gray-500 truncate">{coiffeur.specialty}</p>
          <div className="flex items-center space-x-2 mt-1">
            <div className="flex items-center text-sm">
              <FiStar className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-medium ml-1">{coiffeur.rating}</span>
            </div>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-400">{coiffeur.experience}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default CoiffeurCard

