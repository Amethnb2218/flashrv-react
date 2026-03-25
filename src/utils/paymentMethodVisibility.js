const HIDDEN_ELECTRONIC_PAYMENT_METHODS = new Set([
  'PAYDUNYA',
  'ORANGE_MONEY',
  'WAVE',
  'FREE_MONEY',
])

const normalizePaymentMethodKey = (value) => String(value || '').trim().toUpperCase()

const resolvePaymentMethodKey = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return normalizePaymentMethodKey(value)
  return normalizePaymentMethodKey(value.method || value.id || value.value)
}

export const isElectronicallyHiddenPaymentMethod = (value) =>
  HIDDEN_ELECTRONIC_PAYMENT_METHODS.has(resolvePaymentMethodKey(value))

export const filterVisiblePaymentMethods = (items = []) =>
  (Array.isArray(items) ? items : []).filter((item) => !isElectronicallyHiddenPaymentMethod(item))

export const hasHiddenElectronicPaymentMethods = (items = []) =>
  (Array.isArray(items) ? items : []).some((item) => isElectronicallyHiddenPaymentMethod(item))

export const getVisiblePaymentMethodChoices = (choices = []) =>
  (Array.isArray(choices) ? choices : []).filter((choice) => !isElectronicallyHiddenPaymentMethod(choice))
