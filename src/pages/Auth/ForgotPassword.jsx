import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiMail, FiArrowLeft, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Veuillez entrer votre email')
      return
    }

    setIsLoading(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsLoading(false)
    setIsSent(true)
    toast.success('Email envoyé avec succès !')
  }

  if (isSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20 bg-gradient-to-br from-gray-50 via-white to-amber-50/30 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-green-100/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiCheck className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Email envoyé !
          </h1>
          <p className="text-gray-600 mb-6">
            Si un compte existe avec l'adresse <strong>{email}</strong>, 
            vous recevrez un lien pour réinitialiser votre mot de passe.
          </p>
          <Link 
            to="/login"
            className="btn-primary inline-flex items-center space-x-2"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>Retour à la connexion</span>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 bg-gradient-to-br from-gray-50 via-white to-amber-50/30 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-100/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-md w-full"
      >
        <Link 
          to="/login" 
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <FiArrowLeft className="w-5 h-5 mr-2" />
          Retour
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mot de passe oublié ?</h1>
          <p className="mt-2 text-gray-600">
            Entrez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse email
            </label>
            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-12"
                placeholder="votre@email.com"
                autoComplete="email"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Envoyer le lien'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Besoin d'aide ?{' '}
          <a 
            href="https://wa.me/221776762784" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-green-600 font-medium hover:underline"
          >
            Contactez-nous sur WhatsApp
          </a>
        </p>
      </motion.div>
    </div>
  )
}

export default ForgotPassword

