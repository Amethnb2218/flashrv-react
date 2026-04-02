const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const boutiqueCategoryOptions = [
  { id: 'tshirts', label: 'T-shirts', keywords: ['tshirt', 't shirts', 't shirt', 'tee shirt', 'maillot', 'jersey'] },
  { id: 'montres', label: 'Montres', keywords: ['montre', 'watch', 'watches'] },
  { id: 'chaussures', label: 'Chaussures', keywords: ['chaussure', 'sneaker', 'basket', 'sandale', 'talon'] },
  { id: 'tenues-traditionnelles', label: 'Tenues traditionnelles', keywords: ['tenue traditionnelle', 'boubou', 'kaftan', 'wax', 'pagne', 'traditionnel'] },
  { id: 'tenues-ville', label: 'Tenues de ville', keywords: ['tenue de ville', 'ville', 'chemise', 'pantalon', 'robe', 'ensemble'] },
  { id: 'colliers', label: 'Colliers', keywords: ['collier', 'necklace'] },
  { id: 'bracelets', label: 'Bracelets', keywords: ['bracelet', 'bracelets'] },
  { id: 'accessoires', label: 'Accessoires', keywords: ['accessoire', 'accessories', 'sac', 'casquette', 'lunette'] },
  { id: 'coiffure', label: 'Produits coiffure', keywords: ['coiffure', 'cheveux', 'wig', 'perruque', 'lace', 'extension'] },
  { id: 'beaute', label: 'Produits beaute', keywords: ['beaute', 'beauty', 'soin', 'cosmetique', 'maquillage', 'parfum'] },
]

const boutiqueCategoryMap = new Map(boutiqueCategoryOptions.map((item) => [item.id, item]))

export function getBoutiqueCategoryById(categoryId) {
  return boutiqueCategoryMap.get(String(categoryId || '').trim()) || null
}

export function getBoutiqueCategoryLabel(categoryId) {
  return getBoutiqueCategoryById(categoryId)?.label || String(categoryId || '').trim()
}

export function matchesBoutiqueCategory(product, categoryId) {
  const category = getBoutiqueCategoryById(categoryId)
  if (!category) return false

  const haystack = normalizeText(
    [product?.name, product?.description, product?.category]
      .filter(Boolean)
      .join(' ')
  )

  if (!haystack) return false

  return category.keywords.some((keyword) => haystack.includes(normalizeText(keyword)))
}
