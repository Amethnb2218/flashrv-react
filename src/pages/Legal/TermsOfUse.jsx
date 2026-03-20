import LegalLayout from './LegalLayout'

function TermsOfUse() {
  return (
    <LegalLayout
      title="Conditions d'utilisation"
      subtitle="Regles generales pour l'utilisation de Jolof'Era."
      updatedAt="20 mars 2026"
    >
      <h2>1. Objet</h2>
      <p>Ces conditions encadrent l'utilisation de la plateforme Jolof'Era par les clients, salons et boutiques.</p>

      <h2>2. Compte utilisateur</h2>
      <p>Vous etes responsable des informations de votre compte et de la confidentialite de vos acces.</p>

      <h2>3. Reservations et commandes</h2>
      <p>Les disponibilites, prix et offres sont publies par les professionnels. Jolof'Era facilite la mise en relation.</p>

      <h2>4. Comportements interdits</h2>
      <ul>
        <li>Fraude, usurpation d'identite, contenu mensonger.</li>
        <li>Atteinte a la securite de la plateforme.</li>
        <li>Utilisation abusive des services de paiement.</li>
      </ul>

      <h2>5. Suspension et fermeture</h2>
      <p>En cas de violation grave, un compte peut etre suspendu ou ferme.</p>

      <h2>6. Contact</h2>
      <p>Pour toute question: contact@jolofera.com</p>
    </LegalLayout>
  )
}

export default TermsOfUse

