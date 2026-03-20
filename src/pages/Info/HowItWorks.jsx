import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiSearch, FiCalendar, FiStar, FiShoppingBag, FiArrowRight } from 'react-icons/fi'

const CLIENT_STEPS = [
  { icon: FiSearch, title: 'Rechercher', text: 'Trouvez un salon ou une boutique par quartier, type et disponibilite.' },
  { icon: FiCalendar, title: 'Reserver / Commander', text: 'Choisissez vos services ou articles et confirmez en quelques clics.' },
  { icon: FiStar, title: 'Profiter', text: 'Suivez votre reservation/commande puis laissez votre avis.' },
]

const PRO_STEPS = [
  { icon: FiShoppingBag, title: 'Creer votre espace', text: 'Inscription pro puis validation par l equipe Jolof Era.' },
  { icon: FiCalendar, title: 'Configurer vos offres', text: 'Ajoutez services, horaires, produits et moyens de paiement.' },
  { icon: FiStar, title: 'Developper votre activite', text: 'Recevez des clients et commande en ligne via votre dashboard.' },
]

function StepCard({ step }) {
  const Icon = step.icon
  return (
    <div className="rounded-2xl border border-primary-200 dark:border-[#46382a] bg-white dark:bg-[#1d1712] p-4">
      <div className="w-9 h-9 rounded-xl bg-primary-900 dark:bg-gold-500 text-white dark:text-primary-900 flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="mt-3 font-bold text-primary-900 dark:text-[#f3e8d9]">{step.title}</h3>
      <p className="mt-1 text-sm text-primary-700 dark:text-[#cfbca4]">{step.text}</p>
    </div>
  )
}

function HowItWorks() {
  useEffect(() => {
    const scriptId = 'howitworks-jsonld'
    const previous = document.getElementById(scriptId)
    if (previous) previous.remove()

    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'HowTo',
          name: 'Comment reserver un salon avec Jolof Era',
          step: CLIENT_STEPS.map((item, index) => ({
            '@type': 'HowToStep',
            position: index + 1,
            name: item.title,
            text: item.text,
          })),
        },
        {
          '@type': 'HowTo',
          name: 'Comment demarrer comme professionnel sur Jolof Era',
          step: PRO_STEPS.map((item, index) => ({
            '@type': 'HowToStep',
            position: index + 1,
            name: item.title,
            text: item.text,
          })),
        },
      ],
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = scriptId
    script.text = JSON.stringify(schema)
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gold-50/30 dark:from-[#16120e] dark:via-[#15110d] dark:to-[#120e0b]">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-700 dark:text-gold-300">Guide</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-primary-900 dark:text-[#f3e8d9]">Comment ca marche</h1>
        <p className="mt-2 text-sm sm:text-base text-primary-600 dark:text-[#cfbca4]">Jolof Era simplifie la reservation de salons et la commande en boutique.</p>

        <div className="mt-7">
          <h2 className="text-lg font-bold text-primary-900 dark:text-[#f3e8d9]">Pour les clients</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {CLIENT_STEPS.map((step) => <StepCard key={step.title} step={step} />)}
          </div>
        </div>

        <div className="mt-7">
          <h2 className="text-lg font-bold text-primary-900 dark:text-[#f3e8d9]">Pour les professionnels</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {PRO_STEPS.map((step) => <StepCard key={step.title} step={step} />)}
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/salons" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-900 dark:bg-gold-500 text-white dark:text-primary-900 font-semibold">
            Voir les salons <FiArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/faq" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary-200 dark:border-[#46382a] text-primary-800 dark:text-[#cfbca4]">
            Ouvrir la FAQ
          </Link>
        </div>
      </section>
    </div>
  )
}

export default HowItWorks
