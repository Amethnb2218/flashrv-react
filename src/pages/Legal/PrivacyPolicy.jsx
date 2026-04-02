import LegalLayout from './LegalLayout'

function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Politique de confidentialite"
      subtitle="Comment vos donnees sont collectees, utilisees et protegees sur Jolof'Era."
      updatedAt="2 avril 2026"
    >
      <h2>1. Donnees collectees</h2>
      <p>
        Jolof'Era peut collecter les donnees necessaires au fonctionnement du service, notamment les informations de
        compte, de profil, de reservation, de commande, de paiement, de communication, de navigation et de support.
        Certaines donnees sont renseignees directement par l utilisateur, d autres proviennent des actions effectuees sur
        la plateforme.
      </p>

      <h2>2. Finalites</h2>
      <ul>
        <li>Creer et gerer les comptes clients et professionnels.</li>
        <li>Traiter les reservations, commandes, paiements et notifications.</li>
        <li>Assurer le support client, la moderation et la prevention de la fraude.</li>
        <li>Ameliorer le produit, la recherche, l ergonomie et les statistiques internes.</li>
      </ul>

      <h2>3. Donnees partagees</h2>
      <p>
        Les donnees strictement utiles a l execution d une reservation ou d une commande peuvent etre partagees avec le
        professionnel concerne, par exemple un salon ou une boutique. Les informations necessaires au traitement d un
        paiement peuvent aussi etre transmises au partenaire de paiement choisi dans le respect du parcours affiche.
      </p>

      <h2>4. Usage interne et acces</h2>
      <p>
        Les donnees sont utilisees pour fournir le service, securiser les parcours, organiser les tableaux de bord,
        generer des recapitulatifs utiles et maintenir la qualite du site. Jolof'Era limite l acces a ces donnees aux
        personnes et systemes qui en ont besoin pour exploiter la plateforme.
      </p>

      <h2>5. Conservation</h2>
      <p>
        Les donnees sont conservees pendant la duree necessaire a la gestion du compte, des reservations, des commandes,
        du support, de la prevention des litiges et des obligations administratives, comptables ou legales applicables.
      </p>

      <h2>6. Securite</h2>
      <p>
        Des mesures techniques et organisationnelles raisonnables sont mises en place pour proteger les donnees contre
        les acces non autorises, les pertes, les usages abusifs ou les divulgations non prevues. Chaque utilisateur doit
        aussi proteger ses identifiants et signaler rapidement tout acces suspect.
      </p>

      <h2>7. Vos droits</h2>
      <p>
        Vous pouvez demander l acces, la rectification, la mise a jour ou la suppression de certaines donnees selon la
        nature des informations concernees et les obligations legales applicables. Pour exercer ces droits, vous pouvez
        contacter Jolof'Era a l adresse contact@jolofera.com.
      </p>

      <h2>8. Cookies et mesure d audience</h2>
      <p>
        La plateforme peut utiliser des outils techniques necessaires au maintien de la session, a la navigation, a la
        securite et a la mesure de fonctionnement du service. Les reglages peuvent evoluer selon les besoins
        operationnels du site.
      </p>

      <h2>9. Evolution de la politique</h2>
      <p>
        Cette politique peut etre mise a jour pour refleter l evolution du service, des integrations, des obligations
        legales ou des parcours de paiement. La date de mise a jour visible sur la page fait foi.
      </p>
    </LegalLayout>
  )
}

export default PrivacyPolicy
