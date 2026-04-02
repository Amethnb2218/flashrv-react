import LegalLayout from './LegalLayout'

function LegalNotice() {
  return (
    <LegalLayout
      title="Mentions legales"
      subtitle="Informations legales relatives a l exploitation du site et de la plateforme Jolof'Era."
      updatedAt="2 avril 2026"
    >
      <h2>1. Editeur</h2>
      <p>Le site Jolof'Era est exploite sous la marque Jolof'Era.</p>
      <p>Contact principal: contact@jolofera.com</p>
      <p>Ville de reference: Dakar, Senegal</p>

      <h2>2. Objet du site</h2>
      <p>
        Jolof'Era propose une plateforme numerique permettant de rechercher des salons et des boutiques, de presenter des
        services et des produits, de faciliter les reservations, les commandes, les paiements et la gestion des espaces
        clients et professionnels.
      </p>

      <h2>3. Hebergement</h2>
      <p>
        Le site est heberge sur une infrastructure cloud securisee. L environnement technique exact peut evoluer selon les
        besoins d exploitation, de performance et de securite de la plateforme.
      </p>

      <h2>4. Propriete intellectuelle</h2>
      <p>
        Les textes, interfaces, logos, elements graphiques, marques, bases de donnees, visuels et contenus propres a
        Jolof'Era sont proteges. Toute reproduction, extraction, adaptation ou reutilisation non autorisee est interdite.
      </p>

      <h2>5. Informations diffusees</h2>
      <p>
        Les fiches professionnels, disponibilites, horaires, catalogues, prix, descriptions et conditions publies sur la
        plateforme peuvent provenir des professionnels partenaires. Jolof'Era s efforce de maintenir un niveau de
        qualite eleve mais ne garantit pas l absence totale d erreur, d oubli ou de rupture.
      </p>

      <h2>6. Responsabilite</h2>
      <p>
        Jolof'Era met a disposition une plateforme de mise en relation et de gestion de parcours. Les prestations, ventes,
        remises d articles et executions de services restent de la responsabilite des professionnels partenaires, sous
        reserve des obligations legales pouvant incomber a la plateforme.
      </p>

      <h2>7. Liens et services tiers</h2>
      <p>
        Le site peut integrer ou relayer des services tiers, notamment pour les paiements, certains assets ou certaines
        integrations techniques. Jolof'Era ne maitrise pas toujours l ensemble des regles de ces services externes.
      </p>

      <h2>8. Contact</h2>
      <p>Pour toute demande generale, legale ou de signalement, vous pouvez ecrire a contact@jolofera.com.</p>
    </LegalLayout>
  )
}

export default LegalNotice
