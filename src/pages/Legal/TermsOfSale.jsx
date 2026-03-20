import LegalLayout from './LegalLayout'

function TermsOfSale() {
  return (
    <LegalLayout
      title="CGV"
      subtitle="Conditions generales de vente pour reservations et commandes."
      updatedAt="20 mars 2026"
    >
      <h2>1. Prix</h2>
      <p>Les prix affiches sont indiques par les professionnels. Ils peuvent evoluer selon leurs conditions commerciales.</p>

      <h2>2. Paiement</h2>
      <p>Le paiement peut etre realise en ligne ou selon les options proposees par le professionnel.</p>

      <h2>3. Confirmation</h2>
      <p>Une confirmation est envoyee apres validation de la reservation ou de la commande.</p>

      <h2>4. Annulation et remboursement</h2>
      <p>Les regles d'annulation/remboursement dependent du type de service et de la politique du professionnel.</p>

      <h2>5. Litiges</h2>
      <p>En cas de litige, le support Jolof'Era peut intervenir pour faciliter la resolution entre les parties.</p>
    </LegalLayout>
  )
}

export default TermsOfSale

