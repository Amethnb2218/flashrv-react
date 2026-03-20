import LegalLayout from './LegalLayout'

function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Politique de confidentialite"
      subtitle="Comment vos donnees sont collectées et protégées."
      updatedAt="20 mars 2026"
    >
      <h2>1. Donnees collectees</h2>
      <p>Nous pouvons collecter les donnees de compte, reservation, commande et communication necessaires au service.</p>

      <h2>2. Finalites</h2>
      <ul>
        <li>Gestion des reservations et paiements.</li>
        <li>Support client et prevention de la fraude.</li>
        <li>Amelioration du produit et statistiques internes.</li>
      </ul>

      <h2>3. Partage</h2>
      <p>Les donnees utiles a la prestation sont partagees avec le professionnel concerne (salon ou boutique).</p>

      <h2>4. Conservation</h2>
      <p>Les donnees sont conservees pendant la duree necessaire aux obligations legales et operationnelles.</p>

      <h2>5. Vos droits</h2>
      <p>Vous pouvez demander acces, rectification ou suppression en ecrivant a contact@jolofera.com.</p>

      <h2>6. Securite</h2>
      <p>Des mesures techniques et organisationnelles sont mises en place pour proteger vos informations.</p>
    </LegalLayout>
  )
}

export default PrivacyPolicy

