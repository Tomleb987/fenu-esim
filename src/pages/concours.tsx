export default function ConcoursPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-4 text-gray-800">
      <h1 className="text-4xl font-bold mb-8 text-center text-purple-700">
        📜 Règlement du jeu-concours « Voyagez Connecté »
      </h1>

      <section className="space-y-8 text-sm leading-6">
        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 1 – Organisation</h2>
          <p>
            La société <strong>FENUA SIM SASU</strong>, immatriculée au RCS de Paris sous le numéro [à compléter], dont le siège social est situé au 58 rue Monceau, 75008 Paris, organise un jeu-concours intitulé <strong>« Voyagez Connecté »</strong>, accessible à l’adresse <a href="/concours" className="text-purple-700 underline">https://fenuasim.com/concours</a>, sans obligation d’achat.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 2 – Conditions de participation</h2>
          <p>
            Le concours est ouvert à toute personne physique majeure disposant d’un accès Internet et d’un compte Facebook valide, résidant dans un pays couvert par les services FENUA SIM. Le personnel de FENUA SIM et leurs proches ne peuvent pas participer.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 3 – Modalités de participation</h2>
          <p>Pour participer :</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Aimer la page Facebook <strong>@fenuasim</strong></li>
            <li>Publier une photo de voyage avec le hashtag <strong>#FenuaSIMVoyage</strong></li>
            <li>Inviter ses amis à réagir à la publication</li>
            <li>Remplir le formulaire sur la page du concours</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 4 – Durée du concours</h2>
          <p>
            Le concours est ouvert du <strong>27 août 2025 à 00h00</strong> au <strong>6 septembre 2025 à 23h59 (heure de Tahiti)</strong>.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 5 – Désignation du gagnant</h2>
          <p>
            Le ou la gagnant(e) sera tiré(e) au sort le <strong>7 septembre 2025</strong> et contacté(e) par email. Le résultat sera également annoncé sur la page Facebook <strong>@fenuasim</strong>.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 6 – Dotation</h2>
          <p>
            Le ou la gagnant(e) recevra une <strong>eSIM Monde</strong> d’une valeur commerciale de <strong>100 € TTC</strong>, valable 365 jours dans plus de 100 pays, incluant :
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>20 Go de données</li>
            <li>200 SMS</li>
            <li>200 minutes</li>
          </ul>
          <p>Le lot n’est ni échangeable, ni remboursable.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 7 – Données personnelles</h2>
          <p>
            Les données sont collectées uniquement pour la gestion du concours. Consultez notre <a href="/confidentialite" className="text-purple-700 underline">Politique de confidentialité</a>. Vous pouvez exercer vos droits en nous écrivant à <a href="mailto:contact@fenuasim.com" className="underline">contact@fenuasim.com</a>.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 8 – Responsabilité</h2>
          <p>
            L’organisateur ne saurait être tenu responsable en cas de dysfonctionnement technique, de participation non reçue ou d'informations erronées communiquées par les participants.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 9 – Acceptation</h2>
          <p>
            La participation implique l’acceptation sans réserve du présent règlement. Aucune réclamation ne pourra être acceptée.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-purple-600">Article 10 – Consultation</h2>
          <p>
            Le présent règlement est disponible en ligne à l’adresse suivante : <a href="/concours" className="text-purple-700 underline">https://fenuasim.com/concours</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
