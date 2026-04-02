import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiMinus, FiPlus } from 'react-icons/fi'

const FAQ_ITEMS = [
  {
    q: 'Comment reserver un salon sur Jolof Era ?',
    a: 'Choisissez un salon, consultez les prestations disponibles, selectionnez un creneau puis confirmez votre reservation depuis votre espace client. Si le professionnel active le paiement en ligne, vous pouvez regler directement pendant le parcours.',
  },
  {
    q: 'Comment commander dans une boutique ?',
    a: 'Ajoutez les articles a votre panier, ouvrez le checkout, verifiez le mode de retrait ou de livraison propose puis validez la commande. Les boutiques visibles sur la plateforme gerent ensuite la preparation et la remise des articles.',
  },
  {
    q: 'Puis-je annuler ou modifier une reservation ?',
    a: 'Oui, selon la politique du professionnel et le stade de la reservation. Depuis votre compte, vous pouvez consulter le detail, verifier le statut et contacter le salon si un ajustement est encore possible.',
  },
  {
    q: 'Comment retrouver une boutique ou un article precis ?',
    a: 'Utilisez la recherche par nom, categorie ou quartier. Si vous tapez un article, Jolof Era peut faire remonter les boutiques qui vendent ce produit ainsi que les references proches selon le catalogue publie par les pros.',
  },
  {
    q: 'Quels moyens de paiement sont proposes ?',
    a: 'Cela depend du professionnel et du parcours. Certaines reservations ou commandes peuvent etre payees en ligne, d autres au retrait, sur place ou via un partenaire de paiement. Le recapitulatif affiche toujours la methode disponible avant validation.',
  },
  {
    q: 'Pourquoi des frais plateforme peuvent apparaitre au paiement ?',
    a: 'Quand un paiement passe par DexPay, des frais plateforme de 2 pour cent peuvent etre ajoutes au montant de base. Le total final affiche ces frais avant confirmation pour rester transparent.',
  },
  {
    q: 'Comment devenir professionnel partenaire ?',
    a: 'Utilisez le parcours professionnel, completez votre profil, ajoutez vos services ou articles, vos horaires et vos informations de contact, puis soumettez votre demande pour validation par Jolof Era.',
  },
  {
    q: 'Que voit le client apres reservation ou commande ?',
    a: 'Le compte client centralise les reservations, commandes, notifications, favoris et statuts de paiement. Vous pouvez retrouver le recapitulatif, suivre l evolution du dossier et revenir facilement vers le professionnel concerne.',
  },
  {
    q: 'Comment fonctionnent la livraison et le retrait boutique ?',
    a: 'Chaque boutique peut proposer ses propres modalites. Selon le catalogue, vous verrez si le retrait en boutique, la livraison ou un autre mode de remise est disponible avant la validation finale.',
  },
  {
    q: 'Comment contacter le support Jolof Era ?',
    a: 'Pour une question generale, un signalement ou un besoin d assistance sur une reservation, une commande ou un compte, vous pouvez utiliser les pages d aide et les informations de contact presentes sur le site.',
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fafafa_38%,#f3f4f6_100%)] dark:bg-[linear-gradient(180deg,#09090b_0%,#111111_40%,#171717_100%)]">
      <section className="page-shell py-12 sm:py-16 lg:py-20">
        <div className="overflow-hidden rounded-[32px] border border-black/6 bg-white/88 shadow-[0_32px_100px_-60px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-white/8 dark:bg-[#111111]/92">
          <div className="border-b border-black/6 px-6 py-10 text-center sm:px-10 sm:py-14 dark:border-white/8">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-primary-400 dark:text-white/50">
              Support
            </p>
            <h1 className="mx-auto mt-4 max-w-4xl font-display text-4xl leading-[0.95] tracking-[-0.04em] text-primary-900 sm:text-5xl lg:text-6xl dark:text-white">
              Les questions frequentes
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-primary-500 sm:text-base dark:text-white/64">
              Une base claire pour comprendre les reservations, les commandes, le compte client et le parcours professionnel.
            </p>
          </div>

          <div className="px-5 py-4 sm:px-10 sm:py-6">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openIndex === index
              return (
                <div
                  key={item.q}
                  className="border-b border-black/8 py-1 last:border-b-0 dark:border-white/8"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 px-1 py-5 text-left sm:px-2 sm:py-7"
                  >
                    <span className="text-lg font-medium tracking-[-0.03em] text-primary-900 sm:text-xl dark:text-white">
                      {item.q}
                    </span>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/8 bg-[#f3f4f6] text-primary-700 dark:border-white/10 dark:bg-[#18181b] dark:text-white/82">
                      {isOpen ? <FiMinus className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="pb-6 pl-1 pr-12 sm:pb-8 sm:pl-2">
                      <p className="max-w-3xl text-sm leading-7 text-primary-600 sm:text-base dark:text-white/68">
                        {item.a}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-[28px] border border-black/6 bg-[#111111] px-6 py-6 text-white shadow-[0_24px_80px_-55px_rgba(0,0,0,0.55)] sm:flex-row sm:items-center dark:border-white/8 dark:bg-[#18181b]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">Besoin d&apos;aller plus loin</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/78 sm:text-base">
              Consulte le guide pour voir le parcours client, le fonctionnement boutique et les etapes cote professionnel.
            </p>
          </div>
          <Link
            to="/comment-ca-marche"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-primary-900 transition hover:-translate-y-0.5 hover:bg-[#f3f4f6]"
          >
            Comment ca marche
            <FiArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}

export default FAQ
