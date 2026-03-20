import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const BASE_URL = 'https://jolofera.com'
const SEO_TITLE_MAX = 58
const SEO_DESC_MIN = 70
const SEO_DESC_MAX = 155
const DEFAULT_TITLE = "Jolof'Era | Salons & boutiques au Senegal"
const DEFAULT_DESCRIPTION =
  "Reservez un salon de coiffure ou commandez en boutique a Dakar avec Jolof'Era. Disponibilites en ligne, confirmation rapide et paiement securise."

const normalizeTitle = (value) => {
  const raw = String(value || '').trim() || DEFAULT_TITLE
  return raw.length > SEO_TITLE_MAX ? `${raw.slice(0, SEO_TITLE_MAX - 1).trim()}…` : raw
}

const normalizeDescription = (value) => {
  const raw = String(value || '').trim()
  const withFallback = raw.length < SEO_DESC_MIN ? DEFAULT_DESCRIPTION : raw
  return withFallback.length > SEO_DESC_MAX
    ? `${withFallback.slice(0, SEO_DESC_MAX - 1).trim()}…`
    : withFallback
}

/**
 * Gère dynamiquement les balises canonical et meta robots pour le SEO.
 * @param {Object} props
 * @param {string} [props.title] - Titre de la page
 * @param {string} [props.description] - Description meta
 * @param {string} [props.canonical] - URL canonical custom (sinon basée sur le path)
 * @param {boolean} [props.noindex] - Si true, ajoute noindex
 */
export default function SEOHead({ title, description, canonical, noindex = false }) {
  const { pathname } = useLocation()

  useEffect(() => {
    const safeTitle = normalizeTitle(title)
    const safeDescription = normalizeDescription(description)

    // --- Canonical ---
    const canonicalUrl = canonical || `${BASE_URL}${pathname === '/' ? '' : pathname}`
    let link = document.querySelector('link[rel="canonical"]')
    if (link) {
      link.setAttribute('href', canonicalUrl)
    } else {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      link.setAttribute('href', canonicalUrl)
      document.head.appendChild(link)
    }

    // --- Title ---
    document.title = safeTitle

    // --- Meta description ---
    let meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute('content', safeDescription)
    }

    // --- Meta robots ---
    let robotsMeta = document.querySelector('meta[name="robots"]')
    if (noindex) {
      if (robotsMeta) {
        robotsMeta.setAttribute('content', 'noindex, nofollow')
      } else {
        robotsMeta = document.createElement('meta')
        robotsMeta.setAttribute('name', 'robots')
        robotsMeta.setAttribute('content', 'noindex, nofollow')
        document.head.appendChild(robotsMeta)
      }
    } else {
      if (robotsMeta) {
        robotsMeta.setAttribute('content', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')
      }
    }

    // --- OG URL ---
    let ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl) {
      ogUrl.setAttribute('content', canonicalUrl)
    }

    // --- Keep OG/Twitter aligned with optimized title & description ---
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) ogTitle.setAttribute('content', safeTitle)
    const ogDescription = document.querySelector('meta[property="og:description"]')
    if (ogDescription) ogDescription.setAttribute('content', safeDescription)
    const twitterTitle = document.querySelector('meta[name="twitter:title"]')
    if (twitterTitle) twitterTitle.setAttribute('content', safeTitle)
    const twitterDescription = document.querySelector('meta[name="twitter:description"]')
    if (twitterDescription) twitterDescription.setAttribute('content', safeDescription)
  }, [pathname, title, description, canonical, noindex])

  return null
}

