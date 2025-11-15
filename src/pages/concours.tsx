export default function ConcoursPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-4 text-gray-800">
      <h1 className="text-4xl font-bold mb-8 text-center text-purple-700">
        📜 Règlement du jeu-concours « Destination Mystère »
      </h1>

      <section className="space-y-8 text-sm leading-6">

        {/* Article 1 */}
        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 1 – Organisation</h2>
          <p>
            La société <strong>FENUA SIM SASU</strong>, immatriculée au RCS de Paris sous le numéro 943 713 875,
            dont le siège social est situé au 58 rue Monceau, 75008 Paris, organise un jeu-concours intitulé
            <strong> « Destination Mystère »</strong>, accessible à l’adresse 
            <a href="/concours" className="text-purple-700 underline"> https://fenuasim.com/concours</a>, 
            sans obligation d’achat.
          </p>
        </div>

        {/* Article 2 */}
        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 2 – Conditions de participation</h2>
          <p>
            Le concours est ouvert à toute personne physique majeure disposant d’un accès Internet et résidant
            dans un pays où les services FENUA SIM sont disponibles. Le personnel de FENUA SIM et leurs proches
            ne peuvent pas participer.
          </p>
        </div>

        {/* Article 3 */}
        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 3 – Modalités de participation</h2>
          <p>
            Pour participer, chaque participant doit :
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Tenter de deviner le pays représenté via un <strong>rébus emoji</strong> publié sur notre page.</li>
            <li>Choisir la bonne réponse parmi les 3 propositions affichées.</li>
            <li>Remplir le formulaire officiel du concours.</li>
          </ul>

          <p className="mt-4">
            👉 Formulaire de participation :{" "}
            <a 
              href="https://forms.gle/wjvGeFPzhhWYcoi28"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-700 underline font-semibold"
            >
              https://forms.gle/wjvGeFPzhhWYcoi28
            </a>
          </p>

          <p>Aucune publication sur les réseaux sociaux n’est nécessaire pour participer.</p>
        </div>

        {/* Article 4 */}
        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 4 – Durée du concours</h2>
          <p>
            Le concours est ouvert du <strong>15 novembre 2025 à 00h00</strong> au 
            <strong> 22 novembre 2025 à 23h59 (heure de Tahiti)</strong>.
          </p>
        </div>

        {/* Article 5 */}
        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 5 – Désignation du gagnant</h2>
          <p>
            Un tirage au sort aura lieu parmi les participants ayant donné la bonne réponse. 
            Le tirage au sort sera réalisé le <strong>23 novembre 2025</strong>.  
            Le/la gagnant(e) sera contacté(e) par email et annoncé(e) sur la page Facebook FENUA SIM.
          </p>
        </div>

        {/* Article 6 */}
        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 6 – Dotation</h2>
          <p>
            Le gagnant remportera une <strong>eSIM pour la destination de son choix</strong> d’une valeur maximale de 
            <strong> 30 € TTC</strong>.
          </p>
          <p>Le lot n’est ni échangeable, ni remboursable.</p>
        </div>

        {/* Article 7 */}
        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 7 – Données personnelles</h2>
          <p>
            Les données collectées via le formulaire sont utilisées exclusivement pour la gestion du concours.
            Vous pouvez exercer vos droits en écrivant à 
            <a href="mailto:contact@fenuasim.com" className="underline"> contact@fenuasim.com</a>.
          </p>
        </div>

        {/* Article 8 */}
        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 8 – Responsabilité</h2>
          <p>
            FENUA SIM ne saurait être tenue responsable en cas de dysfonctionnement technique empêchant
            la bonne participation au concours.
          </p>
        </div>

        {/* Article 9 */}
        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 9 – Acceptation</h2>
          <p>
            La participation implique l’acceptation sans réserve du présent règlement.
          </p>
        </div>

        {/* Article 10 */}
        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 10 – Consultation</h2>
          <p>
            Le règlement complet est disponible en ligne à l’adresse 
            <a href="/concours" className="text-purple-700 underline"> https://fenuasim.com/concours</a>.
          </p>
        </div>

      </section>
    </div>
  );
}
