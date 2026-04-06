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
    desc: "Couverture dans +180 pays via les plus grands opérateurs mondiaux. Aucune surprise.",
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

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gray-950 text-white">
        {/* Deco blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600 rounded-full opacity-10 blur-3xl -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-500 rounded-full opacity-10 blur-3xl translate-y-1/3 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 py-24 sm:py-32">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-white/70 tracking-widest uppercase mb-6">
              🌺 Né à Tahiti
            </span>
            <h1 className="text-5xl sm:text-6xl font-extrabold leading-[1.05] tracking-tight mb-6">
              Partir loin.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-orange-400">
                Rester proche.
              </span>
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed max-w-lg">
              <strong className="text-white">Fenua</strong> — en tahitien, c'est "le pays", "la terre natale". 
              FENUA SIM est née de cette idée : rester connecté où qu'on soit, 
              sans jamais perdre le lien avec ceux qu'on aime.
            </p>
          </div>
        </div>

        {/* Séparateur diagonal */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-white" style={{ clipPath: "polygon(0 100%, 100% 100%, 100% 0)" }} />
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 -mt-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <div className="text-3xl font-extrabold text-gray-900 mb-1">{s.value}</div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MOT DU FONDATEUR ──────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Photo placeholder + déco */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] border border-gray-100 shadow-lg">
  <img
    src="/thomas-fondateur.png"
    alt="Thomas, fondateur de FENUA SIM"
    className="w-full h-full object-cover object-top"
  />
</div>
{/* Badge flottant */}
<div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-2.5">
  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
  <span className="text-sm font-bold text-gray-700">Support actif</span>
</div>
          </div>

          {/* Texte */}
          <div>
            <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">Le mot du fondateur</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-6">
              Une conviction simple,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-500">née du Pacifique.</span>
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Je suis <strong className="text-gray-900">Thomas</strong>, fondateur de FENUA SIM. 
                Je vis à Tahiti et je vois chaque semaine des proches, des amis, des voyageurs 
                partir en métropole ou à l'étranger — parfois dans des situations difficiles.
              </p>
              <p>
                À chaque départ, la même galère : trouver un forfait data qui marche vraiment, 
                sans frais surprises, avec quelqu'un à qui parler en français si ça bloque.
              </p>
              <p>
                <strong className="text-gray-900">FENUA SIM, c'est cette réponse.</strong> Un service pensé depuis le Pacifique, 
                pour tous ceux qui bougent dans le monde — avec la chaleur humaine 
                qu'on ne trouve pas chez les grands opérateurs.
              </p>
            </div>
            <p className="mt-6 text-sm text-gray-400 italic border-l-2 border-orange-200 pl-4">
              — Thomas, fondateur de FENUA SIM
            </p>
          </div>
        </div>
      </section>

      {/* ── MISSION & VISION ──────────────────────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">Ce qui nous anime</span>
            <h2 className="mt-3 text-3xl font-extrabold text-gray-900">Mission & Vision</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 font-black text-lg mb-5">◈</div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-3">Notre mission</h3>
              <p className="text-gray-600 leading-relaxed">
                Offrir aux voyageurs du monde entier — et en particulier ceux des <strong>Outre-mer français</strong> — 
                une solution eSIM fiable, économique et simple à activer, où qu'ils se trouvent.
              </p>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-lg mb-5">◉</div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-3">Notre vision</h3>
              <p className="text-gray-600 leading-relaxed">
                Devenir le <strong>compagnon digital de confiance</strong> des voyageurs connectés — 
                touristes, professionnels, patients en déplacement — qui veulent l'esprit tranquille.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALEURS ───────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">Ce en quoi on croit</span>
          <h2 className="mt-3 text-3xl font-extrabold text-gray-900">Nos valeurs</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VALUES.map((v) => (
            <div key={v.title} className={`rounded-2xl border p-6 ${v.color}`}>
              <div className={`text-2xl font-black mb-4 ${v.accent}`}>{v.icon}</div>
              <h3 className="font-extrabold text-gray-900 mb-2">{v.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONFORMITÉ ────────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-12 h-12 rounded-2xl bg-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0 text-xl">
              🔒
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 mb-1">Conformité & protection des données</h3>
              <p className="text-gray-500 text-sm leading-relaxed max-w-2xl">
                <strong className="text-gray-700">FENUA SIM SASU</strong> est domiciliée au 58 rue Monceau, 75008 Paris et respecte strictement le <strong className="text-gray-700">RGPD</strong>. 
                Toutes les données collectées sont utilisées uniquement dans le cadre du service et traitées de manière confidentielle. 
                Aucune donnée n'est revendue à des tiers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="bg-gray-950 rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 rounded-full opacity-10 blur-3xl -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500 rounded-full opacity-10 blur-3xl -ml-16 -mb-16" />
          </div>
          <div className="relative z-10">
            <p className="text-white/60 text-sm font-bold uppercase tracking-widest mb-3">Une question ?</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              On est là pour vous.
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
              Disponibles 7j/7 par email. Notre équipe basée en Polynésie répond en français, avec le sourire. 🌺
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white font-bold text-sm shadow-lg transition-all hover:scale-[1.02]"
              >
                💬 Nous contacter
              </Link>
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/10 transition-all"
              >
                Voir les forfaits →
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
