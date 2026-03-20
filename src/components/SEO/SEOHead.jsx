import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const BASE_URL = 'https://www.jolofera.com'
const SEO_TITLE_MAX = 60
const SEO_DESC_MIN = 110
const SEO_DESC_MAX = 158
const DEFAULT_TITLE = "Reservation salon coiffure Dakar | Jolof'Era"
const DEFAULT_DESCRIPTION =
  "Reservez un salon de coiffure, barbershop ou boutique a Dakar et au Senegal. Comparez les avis, tarifs et disponibilites en ligne avec Jolof'Era."

const normalizeTitle = (value) => {
  const raw = String(value || '').trim() || DEFAULT_TITLE
  return raw.length > SEO_TITLE_MAX ? `${raw.slice(0, SEO_TITLE_MAX - 1).trim()}...` : raw
}

const normalizeDescription = (value) => {
  const raw = String(value || '').trim()
  const withFallback = raw.length < SEO_DESC_MIN ? DEFAULT_DESCRIPTION : raw
  return withFallback.length > SEO_DESC_MAX
    ? `${withFallback.slice(0, SEO_DESC_MAX - 1).trim()}...`
    : withFallback
}

const upsertMeta = (selector, keyAttr, keyValue, contentValue) => {
  let el = document.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(keyAttr, keyValue)
    document.head.appendChild(el)
  }
  el.setAttribute('content', contentValue)
}

/**
 * SEO head manager for SPA pages.
 */
export default function SEOHead({ title, description, canonical, noindex = false }) {
  const { pathname } = useLocation()

  useEffect(() => {
    const safeTitle = normalizeTitle(title)
    const safeDescription = normalizeDescription(description)
    const normalizedPath = pathname === '/' ? '' : pathname.replace(/\/+$/, '')
    const canonicalUrl = canonical || `${BASE_URL}${normalizedPath}`

    let canonicalLink = document.querySelector('link[rel="canonical"]')
    if (!canonicalLink) {
      canonicalLink = document.createElement('link')
      canonicalLink.setAttribute('rel', 'canonical')
      document.head.appendChild(canonicalLink)
    }
    canonicalLink.setAttribute('href', canonicalUrl)

    document.title = safeTitle
    upsertMeta('meta[name="description"]', 'name', 'description', safeDescription)

    if (noindex) {
      upsertMeta('meta[name="robots"]', 'name', 'robots', 'noindex, nofollow')
      upsertMeta('meta[name="googlebot"]', 'name', 'googlebot', 'noindex, nofollow')
    } else {
      upsertMeta(
        'meta[name="robots"]',
        'name',
        'robots',
        'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
      )
      upsertMeta('meta[name="googlebot"]', 'name', 'googlebot', 'index, follow')
    }

    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl)
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', safeTitle)
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', safeDescription)
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website')

    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', safeTitle)
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', safeDescription)
  }, [pathname, title, description, canonical, noindex])

  return null
}

