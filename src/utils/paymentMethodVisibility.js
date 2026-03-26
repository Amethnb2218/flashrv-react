const HIDDEN_CLIENT_PAYMENT_METHODS = new Set([
  'PAYDUNYA',
  'PAYTECH',
  'ORANGE_MONEY',
  'WAVE',
  'FREE_MONEY',
])

const HIDDEN_PRO_PAYMENT_METHODS = new Set([
  'PAYDUNYA',
  'PAYTECH',
])

const normalizePaymentMethodKey = (value) => String(value || '').trim().toUpperCase()

const resolvePaymentMethodKey = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return normalizePaymentMethodKey(value)
  return normalizePaymentMethodKey(value.method || value.id || value.value)
}

const getHiddenSet = (scope = 'client') =>
  String(scope || '').toLowerCase() === 'pro'
    ? HIDDEN_PRO_PAYMENT_METHODS
    : HIDDEN_CLIENT_PAYMENT_METHODS

export const isElectronicallyHiddenPaymentMethod = (value, options = {}) =>
  getHiddenSet(options.scope).has(resolvePaymentMethodKey(value))

export const filterVisiblePaymentMethods = (items = [], options = {}) =>
  (Array.isArray(items) ? items : []).filter((item) => !isElectronicallyHiddenPaymentMethod(item, options))

export const hasHiddenElectronicPaymentMethods = (items = [], options = {}) =>
  (Array.isArray(items) ? items : []).some((item) => isElectronicallyHiddenPaymentMethod(item, options))

export const getVisiblePaymentMethodChoices = (choices = [], options = {}) =>
  (Array.isArray(choices) ? choices : []).filter((choice) => !isElectronicallyHiddenPaymentMethod(choice, options))
