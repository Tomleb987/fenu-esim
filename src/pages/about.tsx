import Link from "next/link";

const VALUES = [
  {
    icon: "✦",
    title: "Accessibilité",
    desc: "100% digital, sans engagement, activation immédiate depuis n'importe où dans le monde.",
    color: "bg-purple-50 border-purple-100",
    accent: "text-purple-600",
  },
  {
    icon: "🌺",
    title: "Proximité",
    desc: "Un service client humain, basé en Polynésie, qui comprend vos réalités de voyageur.",
    color: "bg-orange-50 border-orange-100",
    accent: "text-orange-600",
  },
  {
    icon: "⬡",
    title: "Fiabilité",
    desc: "Couverture dans +180 pays via des opérateurs partenaires internationaux.",
    color: "bg-sky-50 border-sky-100",
    accent: "text-sky-600",
  },
  {
    icon: "◎",
    title: "Transparence",
    desc: "Pas de frais cachés. Le prix affiché est le prix payé — forfaits prépayés et rechargeables.",
    color: "bg-emerald-50 border-emerald-100",
    accent: "text-emerald-600",
  },
];

const STATS = [
  { value: "+180", label: "pays couverts" },
  { value: "2 min", label: "pour s'activer" },
  { value: "100%", label: "support français" },
  { value: "7j/7", label: "disponibilité" },
];

const COMPANY_INFOS = [
  { label: "Raison sociale", value: "FENUA SIM SASU" },
  { label: "Adresse", value: "58 rue Monceau, 75008 Paris, France" },
  { label: "Immatriculation", value: "RCS Paris — SIREN : 943 713 875" },
  { label: "Activité", value: "Distribution de forfaits eSIM prépayés pour voyageurs" },
  { label: "Contact", value: "support@fenuasim.com" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <section className="relative overflow-hidden bg-gray-950 text-white">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600 rounded-full opacity-10 blur-3xl -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-500 rounded-full opacity-10 blur-3xl translate-y-1/3" />

        <div className="relative max-w-5xl mx-auto px-6 py-24 sm:py-32">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-white/70 uppercase mb-6">
              🌺 Né à Tahiti
            </span>
            <h1 className="text-5xl sm:text-6xl font-extrabold mb-6">
              Partir loin.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-orange-400">
                Rester proche.
              </span>
            </h1>
            <p className="text-xl text-gray-400">
              <strong className="text-white">Fenua</strong> — en tahitien, c'est "le pays".
              FENUA SIM est née de cette idée : rester connecté où qu'on soit.
            </p>
          </div>
        </div>
      </section>

      {/* ENTREPRISE */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-20">

          <div className="text-center mb-12">
            <span className="text-xs font-bold text-purple-600 uppercase">
              Transparence
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-gray-900">
              Une société française, un service clair
            </h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
              FENUA SIM SASU — RCS Paris 943 713 875 — est une société spécialisée
              dans la distribution de solutions eSIM pour voyageurs.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">

            {/* INFOS */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h3 className="text-xl font-extrabold mb-5">Informations</h3>
              <div className="space-y-4">
                {COMPANY_INFOS.map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400 uppercase">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ROLE */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h3 className="text-xl font-extrabold mb-5">Notre rôle</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                FENUA SIM agit en tant que <strong>distributeur de forfaits eSIM</strong>.
                Les connexions mobiles sont assurées via des opérateurs partenaires internationaux.
              </p>
              <p className="text-gray-600 text-sm mt-4">
                Nous simplifions l’accès à Internet à l’étranger avec une activation rapide,
                un paiement sécurisé et un support en français.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* CONFORMITÉ */}
      <section className="bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <h3 className="font-extrabold text-gray-900 mb-2">
            🔒 Conformité & protection des données
          </h3>
          <p className="text-gray-500 text-sm max-w-2xl">
            <strong>FENUA SIM SASU — RCS Paris 943 713 875</strong> respecte le RGPD.
            Les données sont utilisées uniquement pour le service et ne sont jamais revendues.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-extrabold mb-4">On est là pour vous</h2>
        <Link href="/contact" className="px-6 py-3 bg-purple-600 text-white rounded-xl">
          Nous contacter
        </Link>
      </section>

    </div>
  );
}
