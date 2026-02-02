import { FiCheck, FiPlus, FiMinus } from 'react-icons/fi'
import { formatPrice, formatDuration } from '../../utils/helpers'
import { motion } from 'framer-motion'

function ServiceCard({ service, isSelected, onToggle }) {
  return (
    <motion.div
      layout
      onClick={onToggle}
      className={`
        p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'border-primary-500 bg-primary-50' 
          : 'border-gray-200 hover:border-primary-300 bg-white'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className={`font-medium ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
            {service.name}
          </h4>
          <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
            <span>{formatDuration(service.duration)}</span>
            <span>•</span>
            <span className="font-semibold text-primary-600">{formatPrice(service.price)}</span>
          </div>
          {service.description && (
            <p className="text-sm text-gray-400 mt-1">{service.description}</p>
          )}
        </div>

        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center transition-colors
          ${isSelected 
            ? 'bg-primary-600 text-white' 
            : 'bg-gray-100 text-gray-400 hover:bg-primary-100 hover:text-primary-600'
          }
        `}>
          {isSelected ? (
            <FiCheck className="w-4 h-4" />
          ) : (
            <FiPlus className="w-4 h-4" />
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default ServiceCard

