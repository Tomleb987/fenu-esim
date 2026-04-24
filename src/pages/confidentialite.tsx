export default function Confidentialite() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Politique de Confidentialité
      </h1>

      <div className="bg-white rounded-xl shadow p-8 space-y-8 border border-purple-100">
        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">1. Introduction</h2>
          <p className="text-gray-700">
            La présente politique de confidentialité a pour objet d’informer les utilisateurs du site FENUA SIM sur la manière dont leurs données personnelles sont collectées, utilisées et protégées.
            Elle s’applique à l’utilisation du site, à la création d’un compte client, à l’achat de forfaits eSIM, aux demandes adressées au support client et, plus généralement, à toute interaction avec FENUA SIM.
          </p>
          <p className="text-gray-700 mt-4">
            FENUA SIM traite les données personnelles conformément au Règlement général sur la protection des données UE 2016/679, dit RGPD, et à la réglementation applicable en matière de protection des données.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">
            2. Responsable du traitement
          </h2>
          <p className="text-gray-700">
            Le responsable du traitement est <strong>FENUA SIM SASU</strong>, société française immatriculée au <strong>RCS de Paris sous le numéro 943 713 875</strong>, dont le siège social est situé au <strong>58 rue Monceau, 75008 Paris, France</strong>.
          </p>
          <p className="text-gray-700 mt-4">
            FENUA SIM exploite un service de distribution de forfaits eSIM prépayés pour voyageurs. Son support client est assuré en français, avec une organisation opérationnelle notamment basée en Polynésie française.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">
            3. Données personnelles collectées
          </h2>

          <h3 className="text-lg font-semibold text-purple-600 mb-2">
            Données liées à l’utilisation du site
          </h3>
          <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
            <li>Pages consultées, date et heure de navigation</li>
            <li>Adresse IP, type d’appareil, navigateur, langue et données techniques nécessaires au fonctionnement du site</li>
            <li>Données de connexion à l’espace client, lorsque celui-ci est utilisé</li>
          </ul>

          <h3 className="text-lg font-semibold text-purple-600 mb-2">
            Données liées aux commandes
          </h3>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Nom, prénom et adresse email</li>
            <li>Pays de destination et forfait eSIM sélectionné</li>
            <li>Informations nécessaires au traitement de la commande et à l’envoi de l’eSIM</li>
            <li>Données de paiement traitées de manière sécurisée par notre prestataire de paiement Stripe</li>
            <li>Échanges avec le support client en cas de demande d’assistance</li>
          </ul>

          <p className="text-gray-700 mt-4">
            FENUA SIM ne collecte pas de copie de passeport, permis de conduire ou document d’identité, sauf obligation légale ou demande exceptionnelle strictement nécessaire à la fourniture du service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">
            4. Finalités du traitement
          </h2>
          <p className="text-gray-700 mb-4">
            Les données personnelles sont collectées et traitées pour les finalités suivantes :
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Création et gestion de l’espace client</li>
            <li>Traitement des commandes de forfaits eSIM</li>
            <li>Envoi des informations d’activation et de suivi de commande</li>
            <li>Gestion du support client et des demandes d’assistance</li>
            <li>Sécurisation du site et prévention des fraudes</li>
            <li>Respect des obligations légales, fiscales et comptables</li>
            <li>Amélioration du service et mesure d’audience non intrusive</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">
            5. Bases légales du traitement
          </h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>L’exécution du contrat lorsque vous achetez un forfait eSIM ou utilisez votre espace client</li>
            <li>Le respect d’obligations légales, notamment fiscales, comptables ou réglementaires</li>
            <li>L’intérêt légitime de FENUA SIM pour sécuriser le site, améliorer le service et répondre aux demandes clients</li>
            <li>Votre consentement lorsque celui-ci est requis</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">
            6. Destinataires des données
          </h2>
          <p className="text-gray-700 mb-4">
            Les données personnelles peuvent être transmises uniquement aux destinataires nécessaires à la fourniture du service :
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Prestataires techniques d’hébergement, de base de données et d’authentification</li>
            <li>Prestataire de paiement sécurisé Stripe</li>
            <li>Fournisseurs et partenaires eSIM nécessaires à l’activation du forfait</li>
            <li>Prestataires de support client, le cas échéant</li>
            <li>Autorités administratives, judiciaires ou fiscales lorsque la loi l’exige</li>
          </ul>
          <p className="text-gray-700 mt-4">
            FENUA SIM ne revend pas les données personnelles de ses clients à des tiers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">
            7. Transferts hors Union européenne
          </h2>
          <p className="text-gray-700">
            Certains prestataires techniques ou partenaires eSIM peuvent être situés en dehors de l’Union européenne.
            Dans ce cas, FENUA SIM veille à ce que les transferts soient encadrés par des garanties appropriées conformément au RGPD, notamment des clauses contractuelles types ou tout mécanisme équivalent reconnu par la réglementation applicable.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">
            8. Durée de conservation
          </h2>
          <p className="text-gray-700">
            Les données personnelles sont conservées pendant la durée strictement nécessaire aux finalités pour lesquelles elles ont été collectées.
            Les données liées aux commandes sont conservées pendant la durée nécessaire à la gestion de la relation commerciale, puis archivées conformément aux obligations légales, fiscales et comptables applicables.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">
            9. Vos droits
          </h2>
          <p className="text-gray-700 mb-4">
            Conformément au RGPD, vous disposez des droits suivants :
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Droit d’accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit d’effacement</li>
            <li>Droit d’opposition</li>
            <li>Droit à la limitation du traitement</li>
            <li>Droit à la portabilité des données</li>
            <li>Droit de retirer votre consentement lorsque le traitement repose sur celui-ci</li>
            <li>Droit d’introduire une réclamation auprès de la CNIL</li>
          </ul>
          <p className="text-gray-700 mt-4">
            Pour exercer vos droits, vous pouvez nous contacter à l’adresse suivante :
            <strong> contact@fenuasim.com</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">
            10. Protection des mineurs
          </h2>
          <p className="text-gray-700">
            Les services FENUA SIM sont destinés aux personnes majeures. Nous ne collectons pas volontairement de données personnelles concernant des mineurs de moins de 18 ans.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">
            11. Sécurité des données
          </h2>
          <p className="text-gray-700">
            FENUA SIM met en œuvre des mesures techniques et organisationnelles raisonnables afin de protéger les données personnelles contre l’accès non autorisé, la perte, l’altération ou la divulgation.
            Les paiements sont traités par un prestataire spécialisé et sécurisé ; FENUA SIM ne conserve pas les données complètes de carte bancaire.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">
            12. Utilisation des cookies
          </h2>
          <p className="text-gray-700 mb-4">
            Le site FENUA SIM utilise uniquement des cookies essentiels au bon fonctionnement du site, de l’espace client et des services associés.
          </p>

          <h3 className="text-lg font-semibold text-purple-600 mb-2">
            12.1 Cookies essentiels
          </h3>
          <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
            <li>Sécurisation des connexions à l’espace client</li>
            <li>Maintien de la session utilisateur</li>
            <li>Fonctionnement du panier, du paiement et des commandes</li>
          </ul>

          <h3 className="text-lg font-semibold text-purple-600 mb-2">
            12.2 Mesure d’audience respectueuse de la vie privée
          </h3>
          <p className="text-gray-700 mb-4">
            FENUA SIM peut utiliser une solution de mesure d’audience respectueuse de la vie privée, sans cookies publicitaires et sans identification directe des utilisateurs.
          </p>

          <h3 className="text-lg font-semibold text-purple-600 mb-2">
            12.3 Absence de cookies publicitaires
          </h3>
          <p className="text-gray-700">
            À ce jour, FENUA SIM n’utilise pas de cookies publicitaires ou de traceurs non essentiels nécessitant un consentement préalable.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">
            13. Contact
          </h2>
          <p className="text-gray-700">
            Pour toute question concernant la présente politique de confidentialité ou l’exercice de vos droits, vous pouvez contacter FENUA SIM à l’adresse suivante :
            <strong> contact@fenuasim.com</strong>.
          </p>
          <p className="text-gray-700 mt-4">
            Adresse postale : FENUA SIM SASU, 58 rue Monceau, 75008 Paris, France.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">
            14. Mises à jour
          </h2>
          <p className="text-gray-700">
            La présente politique peut être modifiée afin de tenir compte des évolutions légales, techniques ou opérationnelles du service FENUA SIM.
            Toute mise à jour sera publiée sur cette page.
          </p>
          <p className="text-gray-700 mt-4">
            Dernière mise à jour : 23 avril 2026.
          </p>
        </section>
      </div>
    </div>
  );
}
