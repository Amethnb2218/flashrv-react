export function parseOptionList(value) {
  if (value == null) return []

  const toStrings = (arr) =>
    arr
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)

  if (Array.isArray(value)) return toStrings(value)

  if (typeof value === 'string') {
    const raw = value.trim()
    if (!raw) return []

    if (
      (raw.startsWith('[') && raw.endsWith(']')) ||
      (raw.startsWith('{') && raw.endsWith('}'))
    ) {
      try {
        return parseOptionList(JSON.parse(raw))
      } catch {
        // fallback parsing below
      }
    }

    return toStrings(raw.split(/[;,|/]/g))
  }

  if (typeof value === 'object') {
    if (Array.isArray(value.values)) return parseOptionList(value.values)
    if (Array.isArray(value.options)) return parseOptionList(value.options)
    return toStrings(Object.values(value))
  }

  return []
}

export function uniqueOptionList(value) {
  return Array.from(new Set(parseOptionList(value)))
}

export function listToInput(value) {
  return uniqueOptionList(value).join(', ')
}

export function parseProductMeta(product) {
  const colors = uniqueOptionList([
    ...parseOptionList(product?.colors),
    ...parseOptionList(product?.colorOptions),
    ...parseOptionList(product?.variants?.colors),
  ])
  const availableColors = uniqueOptionList([
    ...parseOptionList(product?.availableColors),
    ...parseOptionList(product?.availableColorOptions),
  ])
  const sizes = uniqueOptionList([
    ...parseOptionList(product?.sizes),
    ...parseOptionList(product?.sizeOptions),
    ...parseOptionList(product?.variants?.sizes),
  ])
  const deliveryZones = uniqueOptionList(product?.deliveryZones)
  const deliveryFee = Number(product?.deliveryFee || 0)
  const isDeliverable =
    product?.isDeliverable === true ||
    String(product?.isDeliverable || '').toLowerCase() === 'true'

  return {
    colors,
    availableColors: availableColors.length > 0 ? availableColors : colors,
    sizes,
    deliveryZones,
    deliveryFee: Number.isFinite(deliveryFee) ? Math.max(0, deliveryFee) : 0,
    isDeliverable,
  }
}
