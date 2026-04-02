import LegalLayout from './LegalLayout'

function TermsOfSale() {
  return (
    <LegalLayout
      title="CGV"
      subtitle="Conditions generales applicables aux reservations, commandes et paiements proposes sur Jolof'Era."
      updatedAt="2 avril 2026"
    >
      <h2>1. Champ d application</h2>
      <p>
        Les presentes conditions generales de vente encadrent les parcours de reservation, de commande et de paiement
        proposes via Jolof'Era. Elles s appliquent aux clients dans la mesure ou un service ou un article est achete,
        reserve ou regle depuis la plateforme.
      </p>

      <h2>2. Prix</h2>
      <p>
        Les prix affiches sur la plateforme sont renseignes par les professionnels ou derives de leur catalogue. Ils
        peuvent evoluer selon leurs conditions commerciales, la disponibilite, les variantes d articles ou les options
        choisies par le client.
      </p>

      <h2>3. Validation de la reservation ou de la commande</h2>
      <p>
        Avant validation, le client doit verifier les informations du recapitulatif, notamment le professionnel choisi,
        le service ou l article, la quantite, le creneau, le mode de remise et le montant total. La confirmation
        intervient apres validation finale du parcours propose sur le site.
      </p>

      <h2>4. Paiement</h2>
      <p>
        Le paiement peut etre realise en ligne, sur place, au retrait ou selon les options activees par le professionnel.
        Quand le paiement passe par DexPay, des frais plateforme de 2 pour cent peuvent etre ajoutes au montant de base.
        Le total final affiche au client tient compte de ces frais avant confirmation.
      </p>

      <h2>5. Confirmation et preuve</h2>
      <p>
        Une fois le parcours valide, une confirmation peut etre affichee dans le compte client et, selon les cas,
        transmise par notification ou recapitulatif. Les informations disponibles dans le tableau de bord et les statuts
        de commande ou de reservation servent de reference operationnelle.
      </p>

      <h2>6. Retrait, livraison et execution</h2>
      <p>
        Les modalites de retrait, de livraison ou d execution de prestation dependent du professionnel concerne. Le client
        doit consulter les informations communiquees sur la fiche et pendant le checkout avant de confirmer.
      </p>

      <h2>7. Annulation et remboursement</h2>
      <p>
        Les regles d annulation, de report ou de remboursement dependent du type de service, du moment de la demande et
        de la politique du professionnel. Jolof'Era peut faciliter le traitement du dossier mais ne remplace pas les
        engagements propres au salon ou a la boutique.
      </p>

      <h2>8. Litiges</h2>
      <p>
        En cas de litige sur une reservation, une commande, un paiement ou une remise d article, le client est invite a
        contacter d abord le professionnel concerne. Jolof'Era peut intervenir a titre de support pour aider a clarifier
        la situation selon les informations disponibles sur la plateforme.
      </p>
    </LegalLayout>
  )
}

export default TermsOfSale
