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
            <p className="text-xl text-gray-400 leading-relaxed max-w-lg">
              <strong className="text-white">Fenua</strong> — en tahitien, c'est "le pays".
              FENUA SIM est née de cette idée : rester connecté où qu'on soit,
              sans jamais perdre le lien avec ceux qu'on aime.
            </p>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="max-w-5xl mx-auto px-6 -mt-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <div className="text-3xl font-extrabold text-gray-900 mb-1">{s.value}</div>
              <div className="text-xs text-gray-500 uppercase">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FONDATEUR */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          <div className="relative">
            <div className="rounded-3xl overflow-hidden border shadow-lg">
              <img
                src="/thomas-fondateur.png"
                alt="Thomas, fondateur"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow px-4 py-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm font-bold">Support actif</span>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-purple-600 uppercase">Le mot du fondateur</span>
            <h2 className="mt-3 text-3xl font-extrabold mb-6">
              Une conviction simple,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-500">
                née du Pacifique.
              </span>
            </h2>

            <p className="text-gray-600 mb-4">
              Je suis <strong>Thomas</strong>, fondateur de FENUA SIM.
              À chaque départ à l’étranger, la même galère : rester connecté simplement.
            </p>

            <p className="text-gray-600 mb-4">
              FENUA SIM est née pour répondre à ce besoin, avec une approche plus humaine,
              plus simple, et pensée pour les voyageurs d’outre-mer.
            </p>

            <p className="text-gray-400 italic">— Thomas</p>
          </div>
        </div>
      </section>

      {/* ENTREPRISE */}
      <section className="bg-gray-50 border-y">
        <div className="max-w-5xl mx-auto px-6 py-20">

          <div className="text-center mb-12">
            <span className="text-xs text-purple-600 uppercase">Transparence</span>
            <h2 className="text-3xl font-extrabold mt-3">
              Une structure claire, un service maîtrisé
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">

            <div className="bg-white rounded-3xl p-8 border shadow-sm">
              <h3 className="font-extrabold mb-4">Informations</h3>
              <p>FENUA SIM SASU</p>
              <p>RCS Paris 943 713 875</p>
              <p>58 rue Monceau, 75008 Paris</p>
              <p>support@fenuasim.com</p>
            </div>

            <div className="bg-white rounded-3xl p-8 border shadow-sm">
              <h3 className="font-extrabold mb-4">Notre rôle</h3>
              <p className="text-gray-600">
                Nous distribuons des forfaits eSIM via des opérateurs partenaires internationaux.
                Notre mission est de simplifier l’accès à Internet à l’étranger.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FONCTIONNEMENT */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-center text-3xl font-extrabold mb-12">
          Comment ça marche ?
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 border rounded-2xl">
            <h3 className="font-bold mb-2">1. Choisissez</h3>
            <p className="text-sm text-gray-500">Sélectionnez votre forfait</p>
          </div>
          <div className="p-6 border rounded-2xl">
            <h3 className="font-bold mb-2">2. Recevez</h3>
            <p className="text-sm text-gray-500">Recevez votre eSIM</p>
          </div>
          <div className="p-6 border rounded-2xl">
            <h3 className="font-bold mb-2">3. Activez</h3>
            <p className="text-sm text-gray-500">Profitez d’internet</p>
          </div>
        </div>
      </section>

      {/* VALEURS */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-center text-3xl font-extrabold mb-12">Nos valeurs</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VALUES.map((v) => (
            <div key={v.title} className={`p-6 rounded-2xl border ${v.color}`}>
              <div className={`${v.accent} text-xl mb-3`}>{v.icon}</div>
              <h3 className="font-bold">{v.title}</h3>
              <p className="text-sm text-gray-600">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-20">
        <h2 className="text-3xl font-extrabold mb-4">On est là pour vous</h2>
        <Link href="/contact" className="px-6 py-3 bg-purple-600 text-white rounded-xl">
          Nous contacter
        </Link>
      </section>

    </div>
  );
}
