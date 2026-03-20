import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const FAQ_ITEMS = [
  {
    q: 'Comment reserver un salon ?',
    a: 'Allez sur la page Salons, choisissez un etablissement, puis selectionnez un service et un creneau.',
  },
  {
    q: 'Comment commander dans une boutique ?',
    a: 'Ouvrez la boutique, ajoutez les articles au panier, puis finalisez la commande depuis le checkout.',
  },
  {
    q: 'Puis-je annuler une reservation ?',
    a: 'Oui, selon les conditions du salon. Verifiez les details dans votre dashboard client.',
  },
  {
    q: 'Comment devenir partenaire ?',
    a: 'Cliquez sur "Devenir partenaire", completez votre profil pro et attendez la validation.',
  },
]

function FAQ() {
  const [openIndex, setOpenIndex] = useState(0)

  useEffect(() => {
    const scriptId = 'faq-jsonld'
    const previous = document.getElementById(scriptId)
    if (previous) previous.remove()

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = scriptId
    script.text = JSON.stringify(faqSchema)
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gold-50/30 dark:from-[#16120e] dark:via-[#15110d] dark:to-[#120e0b]">
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-700 dark:text-gold-300">Aide</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-primary-900 dark:text-[#f3e8d9]">FAQ</h1>
        <p className="mt-2 text-sm sm:text-base text-primary-600 dark:text-[#cfbca4]">Questions frequentes sur les reservations, commandes et comptes.</p>

        <div className="mt-6 space-y-3">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = index === openIndex
            return (
              <div key={item.q} className="rounded-2xl border border-primary-200 dark:border-[#46382a] bg-white dark:bg-[#1d1712] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="w-full text-left px-4 py-3 font-semibold text-primary-900 dark:text-[#f3e8d9] flex items-center justify-between"
                >
                  <span>{item.q}</span>
                  <span className="text-gold-600 dark:text-gold-300">{isOpen ? '-' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-sm text-primary-700 dark:text-[#cfbca4]">
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6">
          <Link to="/comment-ca-marche" className="text-sm font-semibold text-primary-800 dark:text-gold-300 hover:underline">
            Voir aussi: Comment ca marche
          </Link>
        </div>
      </section>
    </div>
  )
}

export default FAQ
