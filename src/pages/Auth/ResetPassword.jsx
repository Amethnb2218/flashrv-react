import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowLeft, FiCheck, FiLock } from 'react-icons/fi'
import toast from 'react-hot-toast'
import apiFetch from '@/api/client'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = String(searchParams.get('token') || '').trim()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      toast.error('Lien de reinitialisation invalide.')
      return
    }
    if (!password || password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caracteres.')
      return
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      toast.error('Ajoutez une majuscule, une minuscule et un chiffre.')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }

    setIsLoading(true)
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
      })
      setIsDone(true)
      toast.success('Mot de passe mis a jour.')
      setTimeout(() => navigate('/login'), 1600)
    } catch (err) {
      toast.error(err.message || 'Impossible de reinitialiser le mot de passe.')
    } finally {
      setIsLoading(false)
    }
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
          <div className="w-14 h-14 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center mx-auto mb-4">
            {isDone ? (
              <FiCheck className="w-7 h-7 text-green-600 dark:text-green-400" />
            ) : (
              <FiLock className="w-7 h-7 text-gold-700 dark:text-gold-300" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-primary-900 dark:text-white">
            {isDone ? 'Mot de passe change' : 'Nouveau mot de passe'}
          </h1>
          <p className="mt-2 text-primary-600 dark:text-gray-400">
            {isDone ? 'Vous pouvez maintenant vous reconnecter.' : 'Choisissez un mot de passe fort pour votre compte.'}
          </p>
        </div>

        {!isDone && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {!token && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                Lien invalide ou incomplet. Demandez un nouveau lien depuis la page mot de passe oublie.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-gray-300 mb-2">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
                placeholder="Votre nouveau mot de passe"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-gray-300 mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
                placeholder="Confirmez le mot de passe"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !token}
              className="w-full btn-primary flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Mettre a jour'
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}

export default ResetPassword
