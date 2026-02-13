import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiCheck, FiCalendar, FiMapPin, FiClock, FiUser, FiDownload, FiShare2, FiAlertCircle } from 'react-icons/fi'
import confetti from 'canvas-confetti'
import apiFetch from '../../api/client'
import { resolveMediaUrl } from '../../utils/media'

function PaymentSuccess() {
  const location = useLocation()
  const [appointment, setAppointment] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const appointmentId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    return location.state?.appointmentId || searchParams.get('appointmentId')
  }, [location.search, location.state])

  useEffect(() => {
    const loadAppointment = async () => {
      if (!appointmentId) {
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      setError('')
      try {
        const result = await apiFetch(`/appointments/${appointmentId}`)
        const appt = result?.data?.appointment || result?.appointment || null
        setAppointment(appt)
        if (appt) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          })
        }
      } catch (err) {
        setError(err.message || 'Erreur lors du chargement de la réservation')
      } finally {
        setIsLoading(false)
      }
    }

    loadAppointment()
  }, [appointmentId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30 py-12 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
        <div className="relative z-10 max-w-md mx-auto px-4 text-center">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Aucune réservation trouvée</h2>
            <p className="text-gray-600 mb-6">
              {error || 'Il semble que vous n\'ayez pas de réservation récente ou que la session a expiré.'}
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/dashboard"
                className="py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
              >
                Voir mes réservations
              </Link>
              <Link
                to="/salons"
                className="py-3 border border-primary-600 text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
              >
                Réserver maintenant
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const formatPrice = (value) => Number(value || 0).toLocaleString()

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const booking = {
    id: appointment.id,
    date: appointment.date,
    time: appointment.startTime,
    salon: appointment.salon || {},
    services: appointment.service ? [appointment.service] : [],
    totalPrice: appointment.totalPrice ?? appointment.service?.price ?? 0,
    coiffeur: appointment.coiffeur?.user || appointment.coiffeur || null,
    notes: appointment.notes,
    status: appointment.status,
  }

  const statusMap = {
    PENDING: 'En attente',
    PENDING_ASSIGNMENT: 'En attente d\'assignation',
    CONFIRMED: 'Confirmée',
    CONFIRMED_ON_SITE: 'Confirmée (paiement sur place)',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Terminée',
    CANCELLED: 'Annulée',
    NO_SHOW: 'Absence',
  }
  const statusLabel = statusMap[booking.status] || 'Confirmée'

  const salonImage = resolveMediaUrl(
    booking.salon?.image || booking.salon?.gallery?.[0]?.url || ''
  )

  const handlePrint = () => {
    const depositPercentage = booking.services[0]?.depositPercentage || booking.salon?.depositPercentage || null
    const depositAmount = depositPercentage ? Math.round((booking.totalPrice || 0) * depositPercentage / 100) : null
    const remainingAmount = depositAmount ? Math.max((booking.totalPrice || 0) - depositAmount, 0) : null
    const issuedAt = new Date().toLocaleString('fr-FR')
    const servicesHtml = booking.services.map(s => (
      `<tr>
        <td style="padding: 10px 0;">${s.name}</td>
        <td style="padding: 10px 0; text-align:right;">${formatPrice(s.price)} FCFA</td>
      </tr>`
    )).join('')
    const notesHtml = booking.notes ? `<div class="notes">${booking.notes}</div>` : ''
    const html = `<!doctype html>
      <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>Facture - ${booking.id}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 28px; color: #0f172a; }
          h1 { font-size: 20px; margin: 0; }
          .brand { font-size: 18px; font-weight: 700; letter-spacing: 0.4px; }
          .muted { color: #64748b; font-size: 12px; }
          .row { display: flex; justify-content: space-between; gap: 16px; }
          .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-top: 16px; }
          .header { border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          thead th { text-align: left; font-size: 12px; color: #64748b; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          tbody td { border-bottom: 1px solid #f1f5f9; }
          .total-row td { font-weight: 700; border-bottom: none; }
          .right { text-align: right; }
          .chip { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #ecfdf3; color: #15803d; font-size: 12px; font-weight: 600; }
          .notes { margin-top: 12px; padding: 10px 12px; background: #f8fafc; border-radius: 8px; color: #475569; white-space: pre-line; font-size: 12px; }
          @media print {
            body { margin: 0; }
            .card { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header row">
          <div>
            <div class="brand">StyleFlow</div>
            <div class="muted">Reçu / Facture de réservation</div>
          </div>
          <div class="right">
            <div class="muted">Référence</div>
            <div><strong>${booking.id}</strong></div>
            <div class="muted">Émis le ${issuedAt}</div>
          </div>
        </div>

        <div class="row">
          <div class="card" style="flex:1;">
            <div class="muted">Salon</div>
            <div><strong>${booking.salon?.name || 'Salon'}</strong></div>
            <div class="muted">${booking.salon?.address || ''}</div>
            <div class="muted">${booking.salon?.city || ''}</div>
          </div>
          <div class="card" style="flex:1;">
            <div class="muted">Client</div>
            <div><strong>${appointment.client?.name || ''}</strong></div>
            <div class="muted">${appointment.client?.email || ''}</div>
            <div class="muted">${appointment.client?.phoneNumber || ''}</div>
          </div>
        </div>

        <div class="card">
          <div class="row">
            <div>
              <div class="muted">Rendez-vous</div>
              <div><strong>${formatDate(booking.date)}</strong></div>
              <div class="muted">${booking.time || ''}</div>
            </div>
            <div class="right">
              <div class="muted">Statut</div>
              <div class="chip">${statusLabel}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th class="right">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${servicesHtml}
              <tr class="total-row">
                <td>Total</td>
                <td class="right">${formatPrice(booking.totalPrice)} FCFA</td>
              </tr>
              ${depositAmount !== null ? `
                <tr>
                  <td class="muted">Acompte (${depositPercentage}%)</td>
                  <td class="right">${formatPrice(depositAmount)} FCFA</td>
                </tr>
                <tr>
                  <td class="muted">Reste à payer</td>
                  <td class="right">${formatPrice(remainingAmount)} FCFA</td>
                </tr>` : ''}
            </tbody>
          </table>
          ${notesHtml}
        </div>
      </body>
      </html>`
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30 py-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
      
      <div className="relative z-10 max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-12 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <FiCheck className="w-10 h-10 text-green-500" />
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Réservation confirmée !</h1>
            <p className="text-green-100">Votre rendez-vous a été enregistré avec succès</p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="text-center mb-8">
              <p className="text-sm text-gray-500 mb-1">Référence de réservation</p>
              <p className="text-lg sm:text-2xl font-bold text-primary-600 font-mono break-all">{booking.id}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 mb-8">
              <div className="flex flex-col sm:flex-row items-start mb-6 pb-6 border-b border-gray-200 gap-3 sm:gap-0">
                {salonImage ? (
                  <img
                    src={salonImage}
                    alt={booking.salon.name}
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
                    {booking.salon.name?.charAt(0) || 'S'}
                  </div>
                )}
                <div className="ml-4">
                  <h3 className="font-bold text-gray-900 text-lg">{booking.salon.name}</h3>
                  <div className="flex items-center text-gray-500 text-sm mt-1">
                    <FiMapPin className="w-4 h-4 mr-1" />
                    {booking.salon.address}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center mr-3">
                    <FiCalendar className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-semibold text-gray-900">{formatDate(booking.date)}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center mr-3">
                    <FiClock className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Heure</p>
                    <p className="font-semibold text-gray-900">{booking.time}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center mr-3">
                    <FiUser className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Coiffeur(se)</p>
                    <p className="font-semibold text-gray-900">{booking.coiffeur?.name || 'À assigner'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                    <FiCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Statut</p>
                    <p className="font-semibold text-green-600">
                      {statusLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-3">Services réservés</p>
                <div className="space-y-2">
                  {booking.services.map(service => (
                    <div key={service.id} className="flex justify-between">
                      <span className="text-gray-700">{service.name}</span>
                      <span className="font-medium text-gray-900">{formatPrice(service.price)} FCFA</span>
                    </div>
                  ))}
                </div>
                {booking.notes && (
                  <p className="text-xs text-gray-500 mt-3 whitespace-pre-line">{booking.notes}</p>
                )}
                <div className="flex justify-between mt-4 pt-4 border-t border-gray-200">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-primary-600 text-xl">
                    {formatPrice(booking.totalPrice)} FCFA
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FiDownload className="w-5 h-5 mr-2" />
                Imprimer / PDF
              </button>
              <button className="flex-1 flex items-center justify-center px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">
                <FiShare2 className="w-5 h-5 mr-2" />
                Partager
              </button>
            </div>

            <div className="mt-6 p-4 bg-primary-50 rounded-xl">
              <p className="text-sm text-primary-700 text-center">
                📅 N'oubliez pas d'ajouter ce rendez-vous à votre calendrier !
              </p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                to="/dashboard"
                className="flex-1 py-3 bg-primary-600 text-white text-center font-semibold rounded-xl hover:bg-primary-700 transition-colors"
              >
                Voir mes réservations
              </Link>
              <Link
                to="/salons"
                className="flex-1 py-3 border border-primary-600 text-primary-600 text-center font-semibold rounded-xl hover:bg-primary-50 transition-colors"
              >
                Continuer à explorer
              </Link>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-gray-500 text-sm mt-8">
          Besoin d'aide ? Contactez-nous au{' '}
          <a href="https://wa.me/221776762784" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">
            WhatsApp
          </a>
          {' '}ou par email à{' '}
          <a href="mailto:mouhamed26.sall@gmail.com" className="text-primary-600 hover:underline">
            mouhamed26.sall@gmail.com
          </a>
        </p>
      </div>
    </div>
  )
}

export default PaymentSuccess
