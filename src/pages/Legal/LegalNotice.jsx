import LegalLayout from './LegalLayout'

function LegalNotice() {
  return (
    <LegalLayout
      title="Mentions legales"
      subtitle="Informations legales de l'editeur du site."
      updatedAt="20 mars 2026"
    >
      <h2>Editeur</h2>
      <p>Jolof'Era</p>
      <p>Email: contact@jolofera.com</p>
      <p>Ville: Dakar, Senegal</p>

      <h2>Hebergement</h2>
      <p>Infrastructure cloud securisee (hebergeur et region selon environnement de production).</p>

      <h2>Propriete intellectuelle</h2>
      <p>Les contenus, logos, visuels et marques de Jolof'Era sont proteges. Toute reproduction non autorisee est interdite.</p>

      <h2>Responsabilite</h2>
      <p>Jolof'Era met a disposition une plateforme de mise en relation. Les prestations sont executees par les professionnels partenaires.</p>
    </LegalLayout>
  )
}

export default LegalNotice

