import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi'
import apiFetch from '../../api/client'
import { buildPaydunyaPaymentPayload } from '../../utils/payments'

function PaymentCancel() {
  const location = useLocation()
  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')

  const appointmentId = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('appointmentId')
  }, [location.search])

  useEffect(() => {
    const loadAppointment = async () => {
      if (!appointmentId) {
        setInitialLoading(false)
        return
      }
      setInitialLoading(true)
      setError('')
      try {
        const result = await apiFetch(`/appointments/${appointmentId}`)
        const appt = result?.data?.appointment || result?.appointment || null
        setAppointment(appt)
      } catch (err) {
        setError(err.message || 'Impossible de charger la reservation')
      } finally {
        setInitialLoading(false)
      }
    }

    loadAppointment()
  }, [appointmentId])

  const handleRetry = async () => {
    if (!appointment?.id) return
    setLoading(true)
    setError('')

    try {
      const depositPct = Number(appointment?.salon?.depositPercentage || 25)
      const total = Number(appointment?.totalPrice || appointment?.service?.price || 0)
      const depositAmount = Math.max(1, Math.round((total * depositPct) / 100))
      const customerName =
        appointment?.client?.name ||
        [appointment?.clientFirstName, appointment?.clientLastName].filter(Boolean).join(' ') ||
        ''
      const customerEmail = appointment?.client?.email || appointment?.user?.email || ''
      const customerPhone = appointment?.client?.phone || appointment?.clientPhone || appointment?.user?.phone || ''
      const serviceLabel = Array.isArray(appointment?.services) && appointment.services.length > 0
        ? appointment.services.map((service) => service?.name).filter(Boolean).join(', ')
        : appointment?.service?.name || 'Reservation'

      const result = await apiFetch('/payments/create', {
        method: 'POST',
        body: buildPaydunyaPaymentPayload({
          bookingId: appointment.id,
          amount: depositAmount,
          customerName,
          customerEmail,
          customerPhone,
          salonName: appointment?.salon?.name,
          serviceLabel,
        }),
      })

      const payload = result?.data || result
      if (!payload?.invoiceUrl) {
        throw new Error('Erreur lors de la creation de la facture')
      }

      window.location.href = payload.invoiceUrl
    } catch (err) {
      setError(err.message || 'Impossible de relancer le paiement')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-6 sm:p-8">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiAlertCircle className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Paiement annule
        </h1>
        <p className="text-center text-gray-600 mb-6">
          La reservation reste en attente de paiement. Vous pouvez relancer le paiement maintenant ou revenir plus tard.
        </p>

        {appointment && (
          <div className="bg-gray-50 rounded-2xl p-4 mb-5 text-sm">
            <p className="text-gray-800 font-semibold">{appointment.salon?.name || 'Salon'}</p>
            <p className="text-gray-600 mt-1">
              {appointment.date ? new Date(appointment.date).toLocaleDateString('fr-FR') : '-'} a {appointment.startTime || '-'}
            </p>
            <p className="text-gray-600 mt-1">
              Montant: {Number(appointment.totalPrice || appointment.service?.price || 0).toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={handleRetry}
            disabled={loading || !appointment}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition disabled:opacity-60"
          >
            <FiRefreshCw className="w-4 h-4" />
            {loading ? 'Redirection...' : 'Reessayer paiement'}
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
          >
            Mes reservations
          </Link>
        </div>
      </div>
    </div>
  )
}

export default PaymentCancel
