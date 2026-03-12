export default function FenuaSimWorldPage() {
  const countries = [
    "Afrique du Sud", "Albanie", "Algérie", "Allemagne", "Andorre", "Antilles", "Arabie saoudite",
    "Argentine", "Arménie", "Aruba", "Australie", "Autriche", "Azerbaïdjan", "Bahamas", "Bahreïn",
    "Bangladesh", "Belgique", "Belize", "Biélorussie", "Bolivie", "Botswana", "Brésil", "Bulgarie",
    "Cambodge", "Cameroun", "Canada", "Chili", "Chine", "Chypre", "Colombie", "Corée du Sud",
    "Costa Rica", "Croatie", "Danemark", "Égypte", "Émirats arabes unis", "Espagne", "Estonie",
    "États-Unis", "Fidji", "Finlande", "France", "Géorgie", "Ghana", "Grèce", "Guadeloupe",
    "Guam", "Guatemala", "Guernesey", "Guyane", "Honduras", "Hong Kong", "Hongrie", "Inde",
    "Indonésie", "Irlande", "Islande", "Israël", "Italie", "Jamaïque", "Japon", "Jersey",
    "Jordanie", "Kazakhstan", "Kenya", "Koweït", "Lettonie", "Liechtenstein", "Lituanie",
    "Luxembourg", "Macao", "Macédoine du Nord", "Madagascar", "Malaisie", "Mali", "Malte",
    "Maroc", "Mexique", "Moldavie", "Monaco", "Mongolie", "Monténégro", "Mozambique", "Népal",
    "Nicaragua", "Nigeria", "Norvège", "Nouvelle-Zélande", "Oman", "Ouganda", "Ouzbékistan",
    "Pakistan", "Panama", "Paraguay", "Pays-Bas", "Pérou", "Philippines", "Pologne", "Polynésie française",
    "Portugal", "Qatar", "République tchèque", "Réunion", "Roumanie", "Royaume-Uni", "Russie",
    "Saint-Barthélemy", "Saint-Martin", "Salvador", "Serbie", "Singapour", "Slovaquie", "Slovénie",
    "Sri Lanka", "Suède", "Suisse", "Taïwan", "Tanzanie", "Thaïlande", "Tunisie", "Turquie",
    "Ukraine", "Uruguay", "Vietnam"
  ];

  const featuredCountries = [
    "États-Unis",
    "Japon",
    "Australie",
    "Nouvelle-Zélande",
    "Thaïlande",
    "Indonésie",
    "Canada",
    "Royaume-Uni"
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
          <div className="order-1">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?auto=format&fit=crop&w=1200&q=80"
                alt="Forfait eSIM Monde"
                className="h-[260px] w-full object-cover sm:h-[420px] lg:h-[640px]"
              />
            </div>
          </div>

          <div className="order-2 flex flex-col">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-fuchsia-700">
                  eSIM Monde
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Restez connecté dans le monde entier
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  Une seule eSIM pour voyager plus sereinement, sans chercher de carte SIM locale.
                  Activation rapide par QR code, connexion fiable et service client en français.
                </p>
              </div>
              <div className="shrink-0 rounded-2xl bg-fuchsia-600 px-4 py-3 text-right text-white shadow-sm">
                <div className="text-xs uppercase tracking-wide text-fuchsia-100">À partir de</div>
                <div className="text-2xl font-bold">17,00 $</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold">130+ pays</div>
                <div className="mt-1 text-xs text-slate-500">Couverture internationale</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold">QR code</div>
                <div className="mt-1 text-xs text-slate-500">Activation rapide</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold">Data only</div>
                <div className="mt-1 text-xs text-slate-500">Partage de connexion inclus</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold">Support FR</div>
                <div className="mt-1 text-xs text-slate-500">Assistance client francophone</div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Pourquoi ce forfait fonctionne mieux</h2>
              <div className="mt-4 grid gap-3">
                {[
                  "Connexion activable avant le départ ou à l’arrivée.",
                  "Parfait pour les voyages multi-destinations.",
                  "Aucune manipulation compliquée en boutique locale.",
                  "Idéal pour Google Maps, WhatsApp, mails et partage de connexion."
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-fuchsia-600" />
                    <p className="text-sm leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Destinations phares</h2>
                  <p className="mt-1 text-sm text-slate-500">Les pays les plus recherchés par vos voyageurs</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {featuredCountries.map((country) => (
                  <span
                    key={country}
                    className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-sm font-medium text-fuchsia-700"
                  >
                    {country}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <details open className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Tous les pays couverts</h2>
                    <p className="mt-1 text-sm text-slate-500">Affichage optimisé mobile et lecture plus fluide</p>
                  </div>
                  <div className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 group-open:hidden">
                    Ouvrir
                  </div>
                  <div className="hidden rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 group-open:block">
                    Réduire
                  </div>
                </summary>

                <div className="mt-5 max-h-[340px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2">
                    {countries.map((country) => (
                      <div
                        key={country}
                        className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        <span className="h-2 w-2 rounded-full bg-fuchsia-600" />
                        <span>{country}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button className="inline-flex items-center justify-center rounded-2xl bg-fuchsia-600 px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
                Acheter maintenant
              </button>
              <button className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Vérifier la compatibilité
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Astuce : sur mobile, l’utilisateur voit d’abord l’essentiel, puis peut dérouler la liste complète des pays sans se retrouver face à un gros bloc de texte.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
