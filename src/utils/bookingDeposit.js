function normalizePercentage(value) {
  if (value === null || value === undefined || value === '') return null
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return null
  return Math.max(0, Math.min(100, numericValue))
}

function getServiceDepositPercentage(service, salon) {
  const serviceDeposit = normalizePercentage(service?.depositPercentage)
  if (serviceDeposit !== null) return serviceDeposit

  const salonDeposit = normalizePercentage(salon?.depositPercentage)
  if (salonDeposit !== null) return salonDeposit

  return 0
}

export function calculateBookingDeposit({ services = [], salon = null, totalPrice = null } = {}) {
  const normalizedServices = Array.isArray(services) ? services.filter(Boolean) : []
  const computedTotalPrice = normalizedServices.reduce((sum, service) => sum + Number(service?.price || 0), 0)
  const resolvedTotalPrice = Number.isFinite(Number(totalPrice)) ? Number(totalPrice) : computedTotalPrice

  const serviceDeposits = normalizedServices.map((service) => {
    const price = Number(service?.price || 0)
    const percentage = getServiceDepositPercentage(service, salon)
    const amount = Math.round((price * percentage) / 100)

    return {
      service,
      price,
      percentage,
      amount,
    }
  })

  const depositAmount = serviceDeposits.reduce((sum, item) => sum + item.amount, 0)
  const remainingAmount = Math.max(resolvedTotalPrice - depositAmount, 0)
  const uniquePercentages = Array.from(new Set(serviceDeposits.map((item) => item.percentage)))
  const uniformPercentage = uniquePercentages.length === 1 ? uniquePercentages[0] : null
  const effectivePercentage =
    resolvedTotalPrice > 0 ? Math.round((depositAmount / resolvedTotalPrice) * 100) : 0

  return {
    depositAmount,
    remainingAmount,
    effectivePercentage,
    uniformPercentage,
    hasDeposit: depositAmount > 0,
    usesMixedPercentages: uniquePercentages.length > 1,
    serviceDeposits,
    totalPrice: resolvedTotalPrice,
  }
}
