"use client";
import { 
  Mail, 
  MessageCircle, 
  Facebook, 
  Instagram, 
  ArrowRight, 
  Clock 
} from "lucide-react";

/* ------------------------------------------------- 
   CONFIGURATION
--------------------------------------------------*/
const ODOO_EMAIL = "sav@fenua-sim.odoo.com";
const WHATSAPP_NUMBER = "33749782101"; // Format international sans le +
const EMAIL_SUBJECT = "Contact : Demande d'information Fenuasim";
const EMAIL_BODY = `Bonjour,

Je vous contacte pour :
`;

export default function Contact() {
  return (
    <div className="max-w-5xl mx-auto py-16 px-4">
      
      {/* --- EN-TÊTE --- */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Comment pouvons-nous vous aider ?
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Une question sur votre installation ? Un partenariat ? 
          <br className="hidden md:block" />
          Notre équipe vous répondra sur tous les fuseaux horaires.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        
        {/* --- CARTE 1 : SUPPORT TICKET (ODOO) --- */}
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-8 flex flex-col items-start hover:shadow-xl transition-shadow duration-300">
          <div className="bg-purple-100 p-4 rounded-full mb-6 text-purple-600">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Client & Support</h2>
          <p className="text-gray-600 mb-8 flex-grow">
            Pour toute question technique, remboursement ou suivi de commande. Nous créons un ticket et vous répondons sous 24h max.
          </p>
          
          <a 
            href={`mailto:${ODOO_EMAIL}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-purple-700 transition-all transform hover:scale-[1.02]"
          >
            Envoyer un email
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>

        {/* --- CARTE 2 : WHATSAPP (INSTANTANÉ) --- */}
        <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-8 flex flex-col items-start hover:shadow-xl transition-shadow duration-300 relative overflow-hidden">
          {/* Petite déco verte pour différencier */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="bg-green-100 p-4 rounded-full mb-6 text-green-600 relative z-10">
            <MessageCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 relative z-10">WhatsApp Direct</h2>
          <p className="text-gray-600 mb-8 flex-grow relative z-10">
            Besoin d'une réponse rapide ? Discutez directement avec nous. Idéal pour les questions avant achat ou les urgences.
          </p>
          
          <a 
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white px-6 py-4 rounded-xl font-bold hover:bg-[#20bd5a] transition-all transform hover:scale-[1.02] relative z-10"
          >
            <MessageCircle className="w-5 h-5" />
            Discuter sur WhatsApp
          </a>
        </div>

      </div>

      {/* --- SECTION INFOS SECONDAIRES --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Réseaux Sociaux */}
        <div className="md:col-span-2 bg-gray-50 rounded-2xl p-8 border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Suivez nos aventures</h3>
            <p className="text-gray-600">Rejoignez la communauté Fenuasim sur les réseaux.</p>
          </div>
          <div className="flex gap-4">
            <a 
              href="https://www.facebook.com/fenuasim" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white p-4 rounded-full shadow-sm text-blue-600 hover:text-white hover:bg-blue-600 transition-all duration-300"
              aria-label="Facebook"
            >
              <Facebook className="w-6 h-6" />
            </a>
            <a 
              href="https://www.instagram.com/fenuasim" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white p-4 rounded-full shadow-sm text-pink-600 hover:text-white hover:bg-pink-600 transition-all duration-300"
              aria-label="Instagram"
            >
              <Instagram className="w-6 h-6" />
            </a>
          </div>
        </div>

        {/* Horaires / Info diverse */}
        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-4 text-purple-700">
            <Clock className="w-6 h-6" />
            <h3 className="text-lg font-bold">Réactivité</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            Nous traitons les messages <strong>7j/7</strong>. 
            <br />
            En cas de décalage horaire, laissez-nous un message, nous vous recontactons dès notre réveil !
          </p>
        </div>

      </div>
    </div>
  );
}
