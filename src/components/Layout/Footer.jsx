import { Link } from 'react-router-dom'
import Logo from '../UI/Logo'

const quickLinks = [
  { to: '/salons?businessType=SALON', label: 'Trouver un salon' },
  { to: '/salons?businessType=BOUTIQUE', label: 'Explorer les boutiques' },
  { to: '/comment-ca-marche', label: 'Comment ça marche' },
  { to: '/faq', label: 'FAQ' },
]

const companyLinks = [
  { to: '/register?role=pro', label: 'Je suis un professionnel' },
  { to: '/legal/conditions-utilisation', label: "Conditions d'utilisation" },
  { to: '/legal/confidentialite', label: 'Confidentialité' },
  { to: '/legal/mentions-legales', label: 'Mentions légales' },
]

const frequentSearches = [
  { to: '/salons?salonType=coiffure', label: 'Coiffure' },
  { to: '/salons?salonType=beaute', label: 'Institut de beauté' },
  { to: '/salons?type=barber', label: 'Barbier' },
  { to: '/salons?category=shooting', label: 'Studio photo' },
]

function FooterColumn({ title, links }) {
  return (
    <div>
      <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#fff4e3]">{title}</h4>
      <ul className="mt-5 space-y-3 text-sm">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-[#f1d3aa] transition-colors hover:text-[#fffaf0]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative overflow-hidden border-t border-[#4d341c] bg-[#1a120b] text-[#fff4e3]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f0c77d]/35 to-transparent" />
      <div className="absolute left-[-10%] top-0 h-72 w-72 rounded-full bg-[#f5a133]/[0.08] blur-3xl" />
      <div className="absolute bottom-[-8rem] right-[-4rem] h-80 w-80 rounded-full bg-[#ffcb45]/[0.08] blur-3xl" />

      <div className="page-shell relative py-6 sm:py-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div className="max-w-sm sm:max-w-none">
            <Logo size="lg" showTagline variant="light" />
            <p className="mt-4 text-sm leading-7 text-[#f1d3aa]">
              Une plateforme pensée pour réserver un salon, comparer les prestations et commander des articles avec une expérience plus claire et plus crédible.
            </p>

          </div>

          <FooterColumn title="Réserver" links={quickLinks} />
          <FooterColumn title="Jolof'Era" links={companyLinks} />
          <FooterColumn title="Recherches" links={frequentSearches} />
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-[#4d341c] pt-4 text-center text-xs text-[#c59d6f] sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>Copyright © {currentYear} Jolof'Era. Tous droits réservés.</p>
          <p>Produit beauté, réservation et boutique conçu pour une expérience claire sur mobile et desktop.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
