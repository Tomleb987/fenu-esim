export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto py-16 px-4 text-gray-800">
      {/* Titre principal */}
      <h1 className="text-4xl font-bold mb-10 text-center text-purple-700">
        À propos de FENUA SIM
      </h1>

      {/* Introduction */}
      <section className="mb-12 space-y-4">
        <h2 className="text-2xl font-semibold text-fenua-purple">Pourquoi FENUA SIM ?</h2>
        <p>
          Le mot <strong>“Fenua”</strong>, en tahitien, signifie <em>“le pays”, “la terre natale”</em>. 
          C’est un terme chargé d’émotion et d’appartenance pour tous ceux qui vivent ou sont originaires de la Polynésie française.
        </p>
        <p>
          <strong>FENUA SIM</strong> est née de cette idée : permettre à ceux qui quittent leur territoire – que ce soit pour un voyage, une mission, des études ou des soins – de rester connectés facilement, sans stress, et avec une vraie assistance humaine.
        </p>
      </section>

      {/* Mot du fondateur */}
      <section className="mb-12 space-y-4">
        <h2 className="text-2xl font-semibold text-fenua-purple">Le mot du fondateur</h2>
        <p>
          Je suis <strong>Thomas</strong>, fondateur de FENUA SIM. Je vis à Tahiti et je suis régulièrement confronté à des proches, amis ou voyageurs qui partent en métropole ou à l’étranger pour des séjours temporaires, parfois dans des situations délicates.
        </p>
        <p>
          J’ai créé FENUA SIM avec une conviction simple : <strong>la connectivité doit être accessible, simple, abordable – et surtout humaine</strong>.
        </p>
        <p>
          Nos forfaits sont <strong>prépayés et rechargeables</strong>, distribués en partenariat avec de <strong>grands opérateurs internationaux</strong>, couvrant plus de <strong>180 destinations</strong>.
        </p>
        <p>
          Ce qui nous distingue ? <strong>Un accompagnement client avant, pendant et après l’achat</strong>, avec un support 100% en français, attentif, réactif et proche de vos réalités.
        </p>
        <p className="mt-6 italic text-gray-600">– Thomas, fondateur de FENUA SIM</p>
      </section>

      {/* Mission / Vision / Valeurs */}
      <section className="mb-12 space-y-6">
        <h2 className="text-2xl font-semibold text-fenua-purple">Notre mission</h2>
        <p>
          Offrir aux voyageurs du monde entier – et en particulier ceux des <strong>DOM-TOM</strong> – une solution eSIM fiable, économique et simple à activer, où qu’ils soient.
        </p>

        <h2 className="text-2xl font-semibold text-fenua-purple">Notre vision</h2>
        <p>
          Devenir le <strong>compagnon digital</strong> des voyageurs connectés, qu’ils soient touristes, professionnels ou patients en déplacement.
        </p>

        <h2 className="text-2xl font-semibold text-fenua-purple">Nos valeurs</h2>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li><strong>Accessibilité</strong> : 100% digital, sans engagement, activation immédiate.</li>
          <li><strong>Proximité</strong> : Un service client humain, basé en Polynésie, qui comprend vos besoins.</li>
          <li><strong>Fiabilité</strong> : Couverture dans +180 pays via les plus grands opérateurs mondiaux.</li>
          <li><strong>Transparence</strong> : Pas de frais cachés, pas de surprises.</li>
        </ul>
      </section>

      {/* Conformité */}
      <section className="mb-12 space-y-4">
        <h2 className="text-2xl font-semibold text-fenua-purple">Conformité & protection des données</h2>
        <p>
          La société <strong>FENUA SIM SASU</strong> est domiciliée en France et respecte strictement la réglementation européenne sur la protection des données personnelles (<strong>RGPD</strong>).
        </p>
        <p>
          Toutes les données collectées sont utilisées uniquement dans le cadre du service, et traitées de manière confidentielle.
        </p>
      </section>

      {/* CTA */}
      <section className="text-center mt-16">
        <h2 className="text-2xl font-semibold text-purple-700 mb-4">Une question ?</h2>
        <p className="mb-6 text-gray-600">Nous sommes disponibles 7j/7 par email ou via notre formulaire de contact.</p>
        <a
          href="/contact"
          className="inline-block bg-gradient-to-r from-purple-600 to-orange-500 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg transition-all"
        >
          💬 Nous contacter
        </a>
      </section>
    </div>
  );
}
