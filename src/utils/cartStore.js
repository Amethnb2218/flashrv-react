import { parseOptionList } from './productMeta'

const CART_KEY = 'flashrv_cart_v1'
const CART_EVENT = 'flashrv:cart:updated'

const baseCart = { salon: null, items: [] }

const dispatchCartEvent = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(CART_EVENT))
}

const sanitizeItem = (item) => {
  if (!item?.product?.id) return null
  const qty = Number(item.quantity || 0)
  if (!Number.isFinite(qty) || qty <= 0) return null
  return {
    product: item.product,
    quantity: Math.floor(qty),
    selectedSize: item.selectedSize || null,
    selectedColor: item.selectedColor || null,
  }
}

export function readCart() {
  if (typeof window === 'undefined') return { ...baseCart }
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return { ...baseCart }
    const parsed = JSON.parse(raw)
    const items = Array.isArray(parsed?.items)
      ? parsed.items.map(sanitizeItem).filter(Boolean)
      : []
    const salon = parsed?.salon?.id ? parsed.salon : null
    return { salon, items }
  } catch {
    return { ...baseCart }
  }
}

export function writeCart(next) {
  if (typeof window === 'undefined') return { ...baseCart }
  const items = Array.isArray(next?.items)
    ? next.items.map(sanitizeItem).filter(Boolean)
    : []
  const payload = {
    salon: next?.salon?.id ? next.salon : null,
    items,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(CART_KEY, JSON.stringify(payload))
  dispatchCartEvent()
  return { salon: payload.salon, items: payload.items }
}

export function clearCart() {
  return writeCart(baseCart)
}

export function getCartCount() {
  return readCart().items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
}

export function getCartTotal() {
  return readCart().items.reduce(
    (sum, item) => sum + Number(item.product?.price || 0) * Number(item.quantity || 0),
    0
  )
}

export function subscribeCart(listener) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => listener(readCart())
  window.addEventListener(CART_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(CART_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function addItemToCart({ salon, product, quantity = 1, selectedSize = null, selectedColor = null }) {
  const current = readCart()
  const nextSalon =
    current.salon?.id && salon?.id && current.salon.id !== salon.id ? salon : current.salon || salon || null
  const nextItems =
    current.salon?.id && salon?.id && current.salon.id !== salon.id ? [] : [...current.items]

  const idx = nextItems.findIndex(
    (item) =>
      String(item.product?.id) === String(product?.id) &&
      String(item.selectedSize || '') === String(selectedSize || '') &&
      String(item.selectedColor || '') === String(selectedColor || '')
  )

  if (idx >= 0) {
    nextItems[idx] = {
      ...nextItems[idx],
      quantity: Math.max(1, Number(nextItems[idx].quantity || 0) + Number(quantity || 0)),
    }
  } else {
    nextItems.push(
      sanitizeItem({
        product,
        quantity,
        selectedSize,
        selectedColor,
      })
    )
  }

  return writeCart({ salon: nextSalon, items: nextItems.filter(Boolean) })
}

export function removeItemFromCart({ productId, selectedSize = null, selectedColor = null, quantity = 1 }) {
  const current = readCart()
  const nextItems = [...current.items]
  const idx = nextItems.findIndex(
    (item) =>
      String(item.product?.id) === String(productId) &&
      String(item.selectedSize || '') === String(selectedSize || '') &&
      String(item.selectedColor || '') === String(selectedColor || '')
  )
  if (idx < 0) return current

  const currentQty = Number(nextItems[idx].quantity || 0)
  if (currentQty - Number(quantity || 1) > 0) {
    nextItems[idx] = { ...nextItems[idx], quantity: currentQty - Number(quantity || 1) }
  } else {
    nextItems.splice(idx, 1)
  }

  const nextSalon = nextItems.length > 0 ? current.salon : null
  return writeCart({ salon: nextSalon, items: nextItems })
}

export function deriveDeliveryConfigFromItems(items) {
  const list = Array.isArray(items) ? items : []
  if (list.length === 0) {
    return { canDeliverAll: false, minDeliveryFee: 0, deliveryZones: [] }
  }

  let canDeliverAll = true
  let minDeliveryFee = 0
  const zoneSet = new Set()

  list.forEach((entry) => {
    const product = entry?.product || {}
    const isDeliverable =
      product?.isDeliverable === true ||
      String(product?.isDeliverable || '').toLowerCase() === 'true'
    if (!isDeliverable) canDeliverAll = false

    const fee = Number(product?.deliveryFee || 0)
    if (Number.isFinite(fee) && fee > minDeliveryFee) minDeliveryFee = fee

    parseOptionList(product?.deliveryZones).forEach((zone) => zoneSet.add(zone))
  })

  return {
    canDeliverAll,
    minDeliveryFee,
    deliveryZones: Array.from(zoneSet),
  }
}
