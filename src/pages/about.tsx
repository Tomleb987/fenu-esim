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
          <li><strong>Proximité</strong> : Un service
