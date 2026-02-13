import { useBooking } from '../../context/BookingContext'
import { formatPrice, formatDuration, formatDate } from '../../utils/helpers'
import { FiCalendar, FiClock, FiInfo, FiMapPin } from 'react-icons/fi'
import { resolveMediaUrl } from '../../utils/media'

function BookingSummary({ salon }) {
  const { state } = useBooking()
  const { services, date, time, totalPrice, totalDuration } = state

  const resolveSalonImage = () => {
    if (!salon) return ''
    if (salon.coverImage || salon.image) return resolveMediaUrl(salon.coverImage || salon.image)
    if (Array.isArray(salon.gallery) && salon.gallery.length > 0) {
      const first = salon.gallery[0]
      return resolveMediaUrl(first?.media || first?.url)
    }
    if (Array.isArray(salon.images) && salon.images.length > 0) {
      return resolveMediaUrl(salon.images[0])
    }
    return ''
  }
  const salonImage = resolveSalonImage()

  const depositPercentage = salon?.depositPercentage || 25
  const depositAmount = Math.round(totalPrice * depositPercentage / 100)
  const remainingAmount = totalPrice - depositAmount

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:sticky lg:top-24">
      <h3 className="font-semibold text-lg mb-4">Récapitulatif</h3>

      {salon ? (
        <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
          {salonImage ? (
            <img src={salonImage} alt={salon.name} className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">
              {salon.name?.charAt(0) || 'S'}
            </div>
          )}
          <div className="min-w-0">
            <h4 className="font-medium text-gray-900 break-words">{salon.name}</h4>
            <p className="text-sm text-gray-500 flex items-center mt-1">
              <FiMapPin className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="break-words">{salon.neighborhood || salon.address || salon.city || ''}</span>
            </p>
          </div>
        </div>
      ) : null}

      {services.length > 0 ? (
        <div className="py-4 border-b border-gray-100">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Services ({services.length})</h4>
          <ul className="space-y-2">
            {services.map((service) => (
              <li key={service.id} className="flex justify-between text-sm gap-3">
                <span className="text-gray-700 break-words">{service.name}</span>
                <span className="font-medium whitespace-nowrap">{formatPrice(service.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {date ? (
        <div className="py-4 border-b border-gray-100">
          <div className="flex items-center text-sm text-gray-700">
            <FiCalendar className="w-4 h-4 mr-2 text-primary-600" />
            <span>{formatDate(date)}</span>
            {time ? (
              <>
                <span className="mx-2">•</span>
                <FiClock className="w-4 h-4 mr-1 text-primary-600" />
                <span>{time}</span>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {services.length > 0 ? (
        <div className="py-3 border-b border-gray-100">
          <div className="flex items-center text-sm text-gray-500">
            <FiInfo className="w-4 h-4 mr-2 text-blue-500" />
            <span>Coiffeur(se) assigné(e) par le salon</span>
          </div>
        </div>
      ) : null}

      <div className="pt-4 space-y-3">
        {totalDuration > 0 ? (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Durée estimée</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
        ) : null}

        <div className="flex justify-between text-sm text-gray-700">
          <span>Total services</span>
          <span className="font-medium">{formatPrice(totalPrice)}</span>
        </div>

        {services.length > 0 ? (
          <>
            <div className="h-px bg-gray-200" />
            <div className="bg-primary-50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-dark-900">Acompte à payer ({depositPercentage}%)</span>
                <span className="text-lg font-bold text-primary-600">{formatPrice(depositAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Reste à payer au salon</span>
                <span>{formatPrice(remainingAmount)}</span>
              </div>
            </div>
            {salon?.cancellationPolicy ? (
              <div className="flex items-start space-x-2 text-xs text-gray-500 mt-3">
                <FiInfo className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                <p>{salon.cancellationPolicy}</p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}

export default BookingSummary
