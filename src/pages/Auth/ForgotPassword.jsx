import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowLeft, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'
import apiFetch from '@/api/client'

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
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      })
      setIsSent(true)
      toast.success('Si ce compte existe, le lien a ete envoye.')
    } catch (err) {
      toast.error(err.message || 'Impossible d envoyer le lien pour le moment.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20 bg-gradient-to-br from-primary-50 via-white to-gold-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-100/40 dark:bg-gold-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-100/30 dark:bg-gold-900/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-primary-900 dark:text-white mb-2">Email envoye !</h1>
          <p className="text-primary-600 dark:text-gray-400 mb-6">
            Si un compte existe avec l'adresse <strong className="dark:text-white">{email}</strong>,
            vous recevrez un lien pour reinitialiser votre mot de passe.
          </p>
          <Link to="/login" className="btn-primary inline-flex items-center space-x-2">
            <FiArrowLeft className="w-5 h-5" />
            <span>Retour a la connexion</span>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 bg-gradient-to-br from-primary-50 via-white to-gold-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold-100/40 dark:bg-gold-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-100/30 dark:bg-gold-900/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-md w-full"
      >
        <Link to="/login" className="inline-flex items-center text-primary-600 dark:text-gray-400 hover:text-primary-900 dark:hover:text-white mb-6">
          <FiArrowLeft className="w-5 h-5 mr-2" />
          Retour
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-900 dark:text-white">Mot de passe oublie ?</h1>
          <p className="mt-2 text-primary-600 dark:text-gray-400">
            Entrez votre email pour recevoir un lien de reinitialisation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-gray-300 mb-2">
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
              placeholder="votre@email.com"
              autoComplete="email"
            />
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

        <p className="mt-6 text-center text-sm text-primary-600 dark:text-gray-400">
          Besoin d'aide ?{' '}
          <a
            href="https://wa.me/221776762784"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 dark:text-green-400 font-medium hover:underline"
          >
            Contactez-nous sur WhatsApp
          </a>
        </p>
      </motion.div>
    </div>
  )
}

export default ForgotPassword
