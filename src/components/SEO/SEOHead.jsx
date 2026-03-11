import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const BASE_URL = 'https://styleflow.me'

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
    if (title) {
      document.title = title
    }

    // --- Meta description ---
    if (description) {
      let meta = document.querySelector('meta[name="description"]')
      if (meta) {
        meta.setAttribute('content', description)
      }
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
  }, [pathname, title, description, canonical, noindex])

  return null
}
