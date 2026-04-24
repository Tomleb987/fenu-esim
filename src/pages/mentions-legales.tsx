export default function MentionsLegales() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Mentions Légales</h1>

      <div className="bg-white rounded-xl shadow p-8 space-y-8 border border-purple-100">
        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">1. Éditeur du site</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Nom du site : FENUA SIM</li>
            <li>Éditeur : FENUA SIM SASU</li>
            <li>Forme juridique : Société par actions simplifiée unipersonnelle</li>
            <li>Immatriculation : RCS Paris 943 713 875</li>
            <li>SIREN : 943 713 875</li>
            <li>Siège social : 58 rue Monceau, 75008 Paris, France</li>
            <li>Responsable de publication : FENUA SIM SASU</li>
            <li>Email : <a href="mailto:contact@fenuasim.com" className="text-fenua-purple underline">contact@fenuasim.com</a></li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">2. Activité du site</h2>
          <p className="text-gray-700">
            FENUA SIM exploite un site de distribution de forfaits eSIM prépayés pour voyageurs.
            Les services eSIM proposés permettent d’accéder à Internet à l’étranger via des opérateurs et partenaires télécoms internationaux, selon la destination sélectionnée.
          </p>
          <p className="text-gray-700 mt-4">
            FENUA SIM agit en qualité de distributeur de solutions eSIM et ne se présente pas comme un opérateur mobile local.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">3. Hébergement</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Hébergeur : Vercel Inc.</li>
            <li>Adresse : 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</li>
            <li>
              Site :{" "}
              <a
                href="https://vercel.com"
                className="text-fenua-purple underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://vercel.com
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">
            4. Base de données, paiement et prestataires techniques
          </h2>
          <p className="text-gray-700 mb-2">
            Les données nécessaires au fonctionnement du site, à la gestion des comptes clients et au traitement des commandes sont hébergées et sécurisées via Supabase.
          </p>
          <p className="text-gray-700 mb-2">
            Les paiements sont traités de manière sécurisée par Stripe. FENUA SIM ne conserve pas les données complètes de carte bancaire.
          </p>
          <p className="text-gray-700 mb-2">
            Certaines données peuvent être transmises aux fournisseurs et partenaires eSIM strictement nécessaires à la fourniture, l’activation et le suivi des forfaits achetés.
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 mt-4">
            <li>Gestion des commandes et des paiements</li>
            <li>Envoi des informations d’activation eSIM</li>
            <li>Accès aux services des partenaires eSIM</li>
            <li>Support client et assistance technique</li>
          </ul>
          <p className="text-gray-700 mt-4">
            Pour plus d’informations, vous pouvez consulter notre politique de confidentialité.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">5. Propriété intellectuelle</h2>
          <p className="text-gray-700">
            L’ensemble des contenus présents sur le site FENUA SIM, notamment les textes, visuels, logos, éléments graphiques, marques et interfaces, sont protégés par le droit de la propriété intellectuelle.
            Toute reproduction, représentation, diffusion, modification ou exploitation, totale ou partielle, sans autorisation préalable est interdite.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">6. Cookies</h2>
          <p className="text-gray-700">
            Le site FENUA SIM utilise uniquement des cookies essentiels au bon fonctionnement du site, de l’espace client, du panier, du paiement et des commandes.
          </p>
          <p className="text-gray-700 mt-4">
            Le site peut également utiliser une solution de mesure d’audience respectueuse de la vie privée, sans cookies publicitaires ni identification directe des utilisateurs.
          </p>
          <p className="text-gray-700 mt-4">
            Pour plus d’informations, vous pouvez consulter notre politique de confidentialité.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">7. Responsabilité</h2>
          <p className="text-gray-700">
            FENUA SIM s’efforce de fournir des informations exactes, claires et à jour concernant ses forfaits eSIM, leurs destinations, leurs durées de validité, leurs volumes de données et leurs conditions d’utilisation.
          </p>
          <p className="text-gray-700 mt-4">
            La disponibilité, la qualité et la vitesse du réseau peuvent toutefois varier selon le pays, la zone géographique, les opérateurs partenaires, la couverture locale, le terminal utilisé et les paramètres de l’utilisateur.
          </p>
          <p className="text-gray-700 mt-4">
            L’utilisateur est invité à vérifier la compatibilité eSIM de son appareil avant tout achat.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-4">8. Contact</h2>
          <p className="text-gray-700">
            Pour toute question, demande d’assistance ou réclamation, vous pouvez contacter FENUA SIM à l’adresse suivante :{" "}
            <a href="mailto:contact@fenuasim.com" className="text-fenua-purple underline">
              contact@fenuasim.com
            </a>
          </p>
          <p className="text-gray-700 mt-4">
            Adresse postale : FENUA SIM SASU, 58 rue Monceau, 75008 Paris, France.
          </p>
        </section>
      </div>
    </div>
  );
}
