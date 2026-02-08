import { motion } from 'framer-motion'
import { FiClock, FiCheckCircle, FiAlertCircle, FiMail } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'

export default function ProPending() {
  const { user, logout } = useAuth()

  const statusConfig = {
    PENDING: {
      icon: FiClock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      title: 'Compte en attente de validation',
      description: 'Votre demande d\'inscription en tant que professionnel est en cours de traitement. Notre équipe examine votre dossier.',
      tips: [
        'La validation prend généralement 24 à 48 heures',
        'Vous recevrez un email une fois votre compte validé',
        'En attendant, vous pouvez compléter votre profil',
      ],
    },
    REJECTED: {
      icon: FiAlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      title: 'Demande refusée',
      description: 'Malheureusement, votre demande d\'inscription en tant que professionnel n\'a pas été acceptée.',
      tips: [
        'Vérifiez que vos informations sont correctes',
        'Contactez notre support pour plus de détails',
        'Vous pouvez soumettre une nouvelle demande',
      ],
    },
    SUSPENDED: {
      icon: FiAlertCircle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      title: 'Compte suspendu',
      description: 'Votre compte professionnel a été temporairement suspendu.',
      tips: [
        'Contactez notre support pour plus d\'informations',
        'La suspension peut être levée après vérification',
      ],
    },
  }

  const status = user?.status || 'PENDING'
  const config = statusConfig[status] || statusConfig.PENDING
  const StatusIcon = config.icon

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full"
      >
        {/* Status Card */}
        <div className={`${config.bgColor} ${config.borderColor} border-2 rounded-2xl p-8 text-center`}>
          <div className={`inline-flex items-center justify-center w-20 h-20 ${config.bgColor} rounded-full mb-6`}>
            <StatusIcon className={`w-10 h-10 ${config.color}`} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {config.title}
          </h1>

          <p className="text-gray-600 mb-6">
            {config.description}
          </p>

          {/* User Info */}
          <div className="bg-white rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500">Connecté en tant que</p>
            <p className="font-semibold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-600">{user?.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              Compte PRO
            </span>
          </div>

          {/* Tips */}
          <div className="bg-white rounded-xl p-4 text-left mb-6">
            <h3 className="font-medium text-gray-900 mb-3">
              {status === 'PENDING' ? '💡 En attendant...' : '💡 Que faire ?'}
            </h3>
            <ul className="space-y-2">
              {config.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <FiCheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Support */}
          <a
            href="mailto:support@styleflow.sn"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
          >
            <FiMail className="w-4 h-4" />
            Contacter le support
          </a>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Link
              to="/profile"
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Compléter mon profil
            </Link>
            <button
              onClick={logout}
              className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Vous êtes un client ?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Connectez-vous ici
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
