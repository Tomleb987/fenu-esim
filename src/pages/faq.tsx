"use client";
import { useState, useMemo } from "react";
import { 
  ChevronDown, LifeBuoy, Mail, ArrowRight, Search, 
  Smartphone, Wifi, Globe, AlertCircle, ShoppingBag, MessageCircle
} from "lucide-react";

/* ------------------------------------------------- 
   CONFIGURATION ODOO
--------------------------------------------------*/
const ODOO_EMAIL = "sav@fenua-sim.odoo.com";
const EMAIL_SUBJECT = "Question : Demande d'informations générales";
const EMAIL_BODY = `Bonjour l'équipe Fenuasim,

Je n'ai pas trouvé la réponse à ma question dans la FAQ.
Voici ma demande : 

`;

/* ------------------------------------------------- 
   DONNÉES FAQ ENRICHIES
--------------------------------------------------*/
type Category = "general" | "installation" | "usage" | "depannage";

interface FaqItem {
  category: Category;
  question: string;
  answer: React.ReactNode;
}

const FAQS: FaqItem[] = [
  // --- GÉNÉRAL ---
  {
    category: "general",
    question: "Qu'est-ce qu'une eSIM exactement ?",
    answer: "C'est une carte SIM virtuelle déjà soudée dans votre téléphone. Plus besoin d'attendre une lettre ou de chercher un trombone pour ouvrir le tiroir SIM. Vous recevez un mail, vous scannez, et c'est connecté."
  },
  {
    category: "general",
    question: "Mon téléphone est-il compatible ?",
    answer: (
      <span>
        La majorité des smartphones récents (iPhone depuis XR, Samsung S20+, Pixel 4...) le sont. 
        Pour être sûr, faites le test <strong>*#06#</strong> ou consultez notre <a href="/compatibilite" className="text-purple-600 font-bold hover:underline">page de compatibilité</a>.
      </span>
    )
  },
  {
    category: "general",
    question: "Puis-je garder mon numéro WhatsApp ?",
    answer: "OUI ! C'est le grand avantage. Vous utilisez l'eSIM pour la data (internet), mais vous conservez votre numéro habituel pour WhatsApp, Telegram, iMessage, etc. Vos contacts ne verront pas la différence."
  },
  
  // --- INSTALLATION ---
  {
    category: "installation",
    question: "Quand dois-je installer mon eSIM ?",
    answer: "Nous recommandons de l'installer tranquillement chez vous (avec une bonne connexion WiFi) la veille du départ ou à l'aéroport. Ne l'activez dans les réglages qu'une fois arrivé à destination."
  },
  {
    category: "installation",
    question: "Ai-je besoin d'internet pour l'installation ?",
    answer: "Oui, il est impératif d'avoir une connexion WiFi ou 4G active pour scanner le QR code et télécharger le profil eSIM. Une fois installée, vous n'aurez plus besoin du WiFi."
  },
  {
    category: "installation",
    question: "Puis-je installer l'eSIM si je suis déjà sur place ?",
    answer: "Bien sûr, à condition de trouver un accès WiFi (hôtel, café, aéroport) pour recevoir le mail et faire l'installation."
  },

  // --- UTILISATION ---
  {
    category: "usage",
    question: "Le partage de connexion (Hotspot) fonctionne-t-il ?",
    answer: "Oui, sur la plupart de nos forfaits, vous pouvez partager votre connexion avec votre ordinateur ou les téléphones de vos amis/famille."
  },
  {
    category: "usage",
    question: "Comment suivre ma consommation ?",
    answer: "Vous pouvez consulter votre solde de données restant directement dans les réglages de votre téléphone (Données cellulaires) ou via votre espace client sur notre site."
  },
  {
    category: "usage",
    question: "Puis-je recharger mon forfait ?",
    answer: "Oui. Si vous manquez de data ou prolongez votre séjour, connectez-vous à votre compte et achetez une recharge (Top-up). Elle s'ajoutera automatiquement à votre eSIM actuelle."
  },

  // --- DÉPANNAGE ---
  {
    category: "depannage",
    question: "Je n'ai pas internet, que faire ?",
    answer: "Vérifiez deux choses dans vos réglages : 1) L'itinérance des données (Roaming) doit être ACTIVÉE pour l'eSIM. 2) L'APN (point d'accès) doit être correctement configuré selon les instructions reçues par mail."
  },
  {
    category: "depannage",
    question: "J'ai effacé mon eSIM par erreur !",
    answer: "Attention, un QR code ne peut souvent être scanné qu'une seule fois. Contactez immédiatement notre support, nous vérifierons si nous pouvons réactiver votre profil ou si un remplacement est nécessaire."
  },
  {
    category: "depannage",
    question: "La vitesse est lente (3G au lieu de 4G/5G)",
    answer: "Essayez de passer en 'Mode Avion' pendant 10 secondes puis désactivez-le. Cela force le téléphone à se reconnecter à la meilleure antenne disponible."
  },
];

const CATEGORIES: { id: Category | "all"; label: string; icon: any }[] = [
  { id: "all", label: "Tout voir", icon: Globe },
  { id: "general", label: "Général", icon: MessageCircle },
  { id: "installation", label: "Installation", icon: Smartphone },
  { id: "usage", label: "Utilisation", icon: Wifi },
  { id: "depannage", label: "Dépannage", icon: AlertCircle },
];

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Filtrage intelligent
  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
      const matchesSearch = 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (typeof faq.answer === 'string' && faq.answer.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      
      {/* --- EN-TÊTE --- */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Centre d'aide
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Toutes les réponses pour utiliser votre eSIM sans stress.
        </p>
      </div>

      {/* --- BARRE DE RECHERCHE --- */}
      <div className="relative max-w-lg mx-auto mb-10">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition shadow-sm"
          placeholder="Rechercher (ex: whatsapp, vitesse, installation...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* --- ONGLETS CATÉGORIES --- */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeCategory === cat.id
                ? "bg-purple-600 text-white shadow-md transform scale-105"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <cat.icon className="w-4 h-4" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* --- LISTE DES QUESTIONS --- */}
      <div className="space-y-4 mb-16 min-h-[300px]">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, idx) => {
            // L'index doit être unique pour l'animation, on utilise la question comme clé implicite
            const realIndex = FAQS.indexOf(faq); 
            const isOpen = openIndex === realIndex;
            
            return (
              <div 
                key={realIndex} 
                className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                  isOpen 
                    ? "border-purple-200 shadow-md bg-white ring-1 ring-purple-100" 
                    : "border-gray-200 bg-white hover:border-purple-300"
                }`}
              >
                <button
                  onClick={() => toggleFAQ(realIndex)}
                  className="w-full flex items-center justify-between p-5 text-left focus:outline-none group"
                >
                  <span className={`text-lg font-medium pr-4 ${isOpen ? "text-purple-800" : "text-gray-800 group-hover:text-purple-700"}`}>
                    {faq.question}
                  </span>
                  <div className={`p-1 rounded-full transition-colors ${isOpen ? "bg-purple-100" : "bg-gray-100"}`}>
                    <ChevronDown 
                      className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isOpen ? "rotate-180 text-purple-600" : ""}`} 
                    />
                  </div>
                </button>
                
                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-5 pb-6 pt-0 text-gray-600 leading-relaxed border-t border-transparent">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p>Aucune réponse trouvée pour "{searchQuery}".</p>
            <button 
              onClick={() => setSearchQuery("")}
              className="mt-2 text-purple-600 font-semibold hover:underline"
            >
              Tout effacer
            </button>
          </div>
        )}
      </div>

      {/* --- CONTACT ODOO --- */}
      <div className="bg-gray-900 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 rounded-full opacity-20 blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500 rounded-full opacity-20 blur-3xl -ml-16 -mb-16"></div>
        
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-full mb-6 backdrop-blur-md border border-white/10">
            <LifeBuoy className="w-8 h-8 text-purple-300" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4">Vous n'avez pas trouvé votre réponse ?</h2>
          <p className="text-gray-300 mb-8 text-lg">
            Nos experts sont là pour vous aider à configurer votre eSIM.
          </p>

          <a 
            href={`mailto:${ODOO_EMAIL}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`}
            className="inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-purple-900/50"
          >
            <Mail className="w-5 h-5" />
            Écrire au support
          </a>
        </div>
      </div>
    </div>
  );
}
