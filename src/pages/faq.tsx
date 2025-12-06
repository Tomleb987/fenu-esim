"use client";
import { useState } from "react";
import { 
  ChevronDown, 
  LifeBuoy, 
  Mail, 
  ArrowRight, 
  Zap, 
  Smartphone, 
  Calendar, 
  CreditCard,
  HelpCircle 
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
   DONNÉES FAQ (Avec Icônes)
--------------------------------------------------*/
const FAQS = [
  {
    icon: <Zap className="w-5 h-5" />,
    question: "Comment fonctionne l'eSIM ?",
    answer: "L'eSIM est une carte SIM numérique déjà intégrée dans votre téléphone. Plus besoin d'insérer une petite carte en plastique ! Après votre achat, vous recevez un QR code par email. Scannez-le, et votre forfait s'installe automatiquement en quelques secondes."
  },
  {
    icon: <Smartphone className="w-5 h-5" />,
    question: "Mon appareil est-il compatible ?",
    answer: (
      <span>
        La plupart des smartphones récents (iPhone depuis le XR, Samsung S20+, Google Pixel 4...) sont compatibles. 
        Pour en être sûr à 100%, nous vous conseillons de visiter notre <a href="/compatibilite" className="text-purple-600 font-bold hover:underline">page de vérification compatibilité</a>.
      </span>
    )
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    question: "Quand dois-je activer mon eSIM ?",
    answer: "Vous pouvez l'installer tranquillement chez vous avant de partir (vous aurez besoin de WiFi). Ne vous inquiétez pas : la durée de validité du forfait ne commence que lorsque votre téléphone se connecte au réseau local une fois arrivé à destination."
  },
  {
    icon: <CreditCard className="w-5 h-5" />,
    question: "Puis-je recharger mon forfait si je n'ai plus de data ?",
    answer: "Oui, absolument ! Connectez-vous simplement à votre espace client. Vous pourrez ajouter du crédit ou des données supplémentaires (Top-up) à votre eSIM actuelle sans avoir à en réinstaller une nouvelle."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // Le 1er est ouvert par défaut

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-3xl mx-auto py-16 px-4">
      
      {/* --- EN-TÊTE --- */}
      <div className="text-center mb-12">
        <div className="inline-block p-3 bg-purple-100 rounded-full mb-4 text-purple-600">
           <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Questions Fréquentes
        </h1>
        <p className="text-lg text-gray-600">
          Tout ce que vous devez savoir pour voyager connecté.
        </p>
      </div>

      {/* --- LISTE ACCORDÉON --- */}
      <div className="space-y-4 mb-16">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div 
              key={idx} 
              className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                isOpen 
                  ? "border-purple-200 shadow-md bg-white ring-1 ring-purple-100" 
                  : "border-gray-200 bg-white hover:border-purple-300"
              }`}
            >
              <button
                onClick={() => toggleFAQ(idx)}
                className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg transition-colors ${isOpen ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {faq.icon}
                  </div>
                  <span className={`text-lg font-semibold ${isOpen ? "text-purple-800" : "text-gray-700"}`}>
                    {faq.question}
                  </span>
                </div>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-purple-600" : ""}`} 
                />
              </button>
              
              {/* Contenu déroulant */}
              <div 
                className={`transition-all duration-300 ease-in-out ${
                  isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-5 pb-6 pl-[4.5rem] text-gray-600 leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- CONTACT SUPPORT (ODOO DIRECT) --- */}
      <div className="bg-gray-900 rounded-3xl p-8 md:p-10 text-center text-white relative overflow-hidden shadow-2xl">
        {/* Déco fond (identique à la page compatibilité pour la cohérence) */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 rounded-full opacity-20 blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500 rounded-full opacity-20 blur-3xl -ml-16 -mb-16"></div>
        
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-full mb-6 backdrop-blur-md border border-white/10">
            <LifeBuoy className="w-8 h-8 text-purple-300" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4">Une question spécifique ?</h2>
          <p className="text-gray-300 mb-8 text-lg">
            Notre équipe est là pour vous aider si vous ne trouvez pas votre réponse ici.
          </p>

          <a 
            href={`mailto:${ODOO_EMAIL}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`}
            className="inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-purple-900/50 group"
          >
            <Mail className="w-5 h-5" />
            Contacter le support
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
          
          <p className="mt-6 text-sm text-gray-500">
            Nous répondons généralement en moins de 2 heures.
          </p>
        </div>
      </div>

    </div>
  );
}
