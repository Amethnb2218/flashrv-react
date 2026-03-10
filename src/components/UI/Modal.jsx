import { motion, AnimatePresence } from 'framer-motion'
import { FiX } from 'react-icons/fi'

function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
    'mobile-full': 'max-w-2xl'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gradient-to-br from-black/60 via-blue-900/40 to-fuchsia-900/30 backdrop-blur-2xl z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center ${size === 'mobile-full' ? 'p-0 sm:p-4' : 'p-4'}`}
          >
            <div className={`relative bg-gradient-to-br from-white/90 via-blue-50/80 to-fuchsia-100/60 shadow-2xl border border-white/30 backdrop-blur-2xl w-full ${sizes[size]} overflow-hidden animate-fade-in ${size === 'mobile-full' ? 'max-h-[85vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl' : 'max-h-[90vh] rounded-2xl'}`} style={{ boxShadow: '0 8px 32px 0 #3b82f633, 0 0 24px 2px #a21caf22' }}>
              {/* Glow mesh effect */}
              <div className="absolute -inset-2 z-0 rounded-2xl blur-2xl opacity-40 pointer-events-none bg-gradient-to-br from-blue-400/20 via-amber-200/10 to-fuchsia-400/10" />
              {/* Header */}
              {title && (
                <div className="relative flex items-center justify-between px-6 py-4 border-b border-gray-100 z-10">
                  <h3 className="font-semibold text-lg text-gray-900 drop-shadow-glow">{title}</h3>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-blue-100 rounded-full transition-colors drop-shadow-glow"
                  >
                    <FiX className="w-5 h-5 text-blue-500" />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className={`relative overflow-y-auto z-10 ${size === 'mobile-full' ? 'max-h-[calc(85vh-60px)] sm:max-h-[calc(90vh-80px)]' : 'max-h-[calc(90vh-80px)]'}`}>
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default Modal

