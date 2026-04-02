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
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center ${size === 'mobile-full' ? 'p-0 sm:p-4' : 'p-4'}`}
          >
            <div className={`relative w-full overflow-hidden border border-[var(--line)] bg-[var(--surface-strong)] shadow-[var(--shadow-card)] ${sizes[size]} animate-fade-in ${size === 'mobile-full' ? 'max-h-[85vh] sm:max-h-[90vh] rounded-t-none sm:rounded-none' : 'max-h-[90vh] rounded-none'}`}>
              {/* Header */}
              {title && (
                <div className="relative z-10 flex items-center justify-between border-b border-[var(--line)] bg-[#fff2df] px-6 py-4">
                  <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
                  <button
                    onClick={onClose}
                    className="p-2 transition-colors hover:bg-[#fff8ee]"
                  >
                    <FiX className="w-5 h-5 text-[#7a6148]" />
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
