import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiHome, FiSearch, FiArrowLeft } from 'react-icons/fi'

function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-100/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* 404 Number */}
          <h1 className="text-9xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-amber-600 text-transparent bg-clip-text">
            404
          </h1>
          
          {/* Scissors animation */}
          <div className="my-8 text-6xl">✂️</div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Page introuvable
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Oups ! Cette page semble avoir été coupée de notre site. 
            Ne vous inquiétez pas, retournez à l'accueil pour retrouver votre chemin.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors shadow-lg"
            >
              <FiHome className="w-5 h-5 mr-2" />
              Retour à l'accueil
            </Link>
            <Link
              to="/salons"
              className="inline-flex items-center justify-center px-6 py-3 border-2 border-gray-900 text-gray-900 font-semibold rounded-xl hover:bg-gray-900 hover:text-white transition-colors"
            >
              <FiSearch className="w-5 h-5 mr-2" />
              Explorer les salons
            </Link>
          </div>

          {/* Go back */}
          <button
            onClick={() => window.history.back()}
            className="mt-8 inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4 mr-1" />
            Retourner à la page précédente
          </button>
        </motion.div>
      </div>
    </div>
  )
}

export default NotFound

