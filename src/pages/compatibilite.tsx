"use client";
import { useState } from "react";
import { Phone, Settings, AlertTriangle, CheckCircle, Smartphone, LifeBuoy, Mail } from "lucide-react";

/* =========================================================
   CONFIGURATION ODOO
   Remplacez l'email ci-dessous par l'alias de votre 
   équipe Assistance dans Odoo (ex: helpdesk@votre-domaine.odoo.com)
   ========================================================= */
const ODOO_SUPPORT_EMAIL = "support@votre-site.com"; 
const EMAIL_SUBJECT = "Demande d'assistance : Compatibilité eSIM";
const EMAIL_BODY = "Bonjour, j'ai un doute sur la compatibilité de mon appareil. Voici mon modèle : ... (Vous pouvez joindre une capture d'écran de votre *#06#)";

export default function GuideCompatibilite() {
  const [activeTab, setActiveTab] = useState<"ios" | "android">("ios");

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      {/* En-tête */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Votre téléphone est-il compatible eSIM ?
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Certaines versions régionales ne sont pas compatibles.
          <span className="font-semibold text-purple-700"> Vérifiez votre appareil pour être sûr à 100%.</span>
        </p>
      </div>

      {/* -------------------------------------------------
          MÉTHODE 1 : LE CODE UNIVERSEL
         -------------------------------------------------- */}
      <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden mb-12">
        <div className="bg-purple-600 px-6 py-4 text-white flex items-center justify-center gap-2">
          <Phone className="w-6 h-6" />
          <h2 className="text-xl font-bold">Méthode rapide : le code magique</h2>
        </div>
        
        <div className="p-8 md:flex items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 text-center mb-4 inline-block w-full">
              <p className="text-gray-600 mb-2 font-medium">Tapez sur votre clavier d'appel :</p>
              <p className="text-5xl font-black text-purple-700 tracking-widest my-4">*#06#</p>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <h3 className="text-xl font-bold text-gray-800">Résultat :</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 bg-green-50 p-3 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                <span className="text-sm text-green-800">
                  <strong>Compatible :</strong> Si le code <strong>EID</strong> apparaît.
                </span>
              </li>
              <li className="flex items-start gap-3 bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-1" />
                <span className="text-sm text-red-800">
                  <strong>Non compatible :</strong> Si aucun EID n'est affiché.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------
          MÉTHODE 2 : LES RÉGLAGES
         -------------------------------------------------- */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden mb-16">
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab("ios")}
            className={`flex-1 py-4 font-bold flex justify-center gap-2 ${activeTab === "ios" ? "bg-white text-purple-700 border-t-4 border-t-purple-600" : "text-gray-500"}`}
          >
            <Smartphone className="w-5 h-5" /> iPhone
          </button>
          <button
            onClick={() => setActiveTab("android")}
            className={`flex-1 py-4 font-bold flex justify-center gap-2 ${activeTab === "android" ? "bg-white text-purple-700 border-t-4 border-t-purple-600" : "text-gray-500"}`}
          >
            <Settings className="w-5 h-5" /> Android
          </button>
        </div>

        <div className="p-8">
          {activeTab === "ios" ? (
            <div className="space-y-4">
               <p className="text-lg font-medium">Réglages {'>'} Données cellulaires</p>
               <p className="text-gray-600">Cherchez l'option <strong>"Ajouter une eSIM"</strong>.</p>
            </div>
          ) : (
            <div className="space-y-4">
               <p className="text-lg font-medium">Paramètres {'>'} Connexions {'>'} Gestionnaire SIM</p>
               <p className="text-gray-600">Cherchez l'option <strong>"Ajouter un forfait mobile"</strong>.</p>
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------
          CONTACT ODOO ASSISTANCE
         -------------------------------------------------- */}
      <div className="bg-gray-900 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
        {/* Effet visuel de fond */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-orange-500"></div>
        
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <LifeBuoy className="w-8 h-8 text-purple-300" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4">Toujours un doute ?</h2>
          <p className="text-gray-300 mb-8 text-lg">
            Ne prenez pas de risque. Envoyez-nous une capture d'écran de votre menu <strong>*#06#</strong> ou de vos réglages. Notre équipe technique vérifiera pour vous.
          </p>

          <a 
            href={`mailto:${ODOO_SUPPORT_EMAIL}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`}
            className="inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-purple-900/50"
          >
            <Mail className="w-5 h-5" />
            Contacter le support
          </a>
          
          <p className="mt-4 text-sm text-gray-400">
            Réponse rapide garantie par notre équipe technique.
          </p>
        </div>
      </div>

    </div>
  );
}"use client";
import { useState } from "react";
import { Phone, Settings, AlertTriangle, CheckCircle, Smartphone, LifeBuoy, Mail } from "lucide-react";

/* =========================================================
   CONFIGURATION ODOO
   Remplacez l'email ci-dessous par l'alias de votre 
   équipe Assistance dans Odoo (ex: helpdesk@votre-domaine.odoo.com)
   ========================================================= */
const ODOO_SUPPORT_EMAIL = "support@votre-site.com"; 
const EMAIL_SUBJECT = "Demande d'assistance : Compatibilité eSIM";
const EMAIL_BODY = "Bonjour, j'ai un doute sur la compatibilité de mon appareil. Voici mon modèle : ... (Vous pouvez joindre une capture d'écran de votre *#06#)";

export default function GuideCompatibilite() {
  const [activeTab, setActiveTab] = useState<"ios" | "android">("ios");

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      {/* En-tête */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Votre téléphone est-il compatible eSIM ?
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Certaines versions régionales ne sont pas compatibles.
          <span className="font-semibold text-purple-700"> Vérifiez votre appareil pour être sûr à 100%.</span>
        </p>
      </div>

      {/* -------------------------------------------------
          MÉTHODE 1 : LE CODE UNIVERSEL
         -------------------------------------------------- */}
      <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden mb-12">
        <div className="bg-purple-600 px-6 py-4 text-white flex items-center justify-center gap-2">
          <Phone className="w-6 h-6" />
          <h2 className="text-xl font-bold">Méthode rapide : le code magique</h2>
        </div>
        
        <div className="p-8 md:flex items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 text-center mb-4 inline-block w-full">
              <p className="text-gray-600 mb-2 font-medium">Tapez sur votre clavier d'appel :</p>
              <p className="text-5xl font-black text-purple-700 tracking-widest my-4">*#06#</p>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <h3 className="text-xl font-bold text-gray-800">Résultat :</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 bg-green-50 p-3 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                <span className="text-sm text-green-800">
                  <strong>Compatible :</strong> Si le code <strong>EID</strong> apparaît.
                </span>
              </li>
              <li className="flex items-start gap-3 bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-1" />
                <span className="text-sm text-red-800">
                  <strong>Non compatible :</strong> Si aucun EID n'est affiché.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------
          MÉTHODE 2 : LES RÉGLAGES
         -------------------------------------------------- */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden mb-16">
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab("ios")}
            className={`flex-1 py-4 font-bold flex justify-center gap-2 ${activeTab === "ios" ? "bg-white text-purple-700 border-t-4 border-t-purple-600" : "text-gray-500"}`}
          >
            <Smartphone className="w-5 h-5" /> iPhone
          </button>
          <button
            onClick={() => setActiveTab("android")}
            className={`flex-1 py-4 font-bold flex justify-center gap-2 ${activeTab === "android" ? "bg-white text-purple-700 border-t-4 border-t-purple-600" : "text-gray-500"}`}
          >
            <Settings className="w-5 h-5" /> Android
          </button>
        </div>

        <div className="p-8">
          {activeTab === "ios" ? (
            <div className="space-y-4">
               <p className="text-lg font-medium">Réglages {'>'} Données cellulaires</p>
               <p className="text-gray-600">Cherchez l'option <strong>"Ajouter une eSIM"</strong>.</p>
            </div>
          ) : (
            <div className="space-y-4">
               <p className="text-lg font-medium">Paramètres {'>'} Connexions {'>'} Gestionnaire SIM</p>
               <p className="text-gray-600">Cherchez l'option <strong>"Ajouter un forfait mobile"</strong>.</p>
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------
          CONTACT ODOO ASSISTANCE
         -------------------------------------------------- */}
      <div className="bg-gray-900 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
        {/* Effet visuel de fond */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-orange-500"></div>
        
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <LifeBuoy className="w-8 h-8 text-purple-300" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4">Toujours un doute ?</h2>
          <p className="text-gray-300 mb-8 text-lg">
            Ne prenez pas de risque. Envoyez-nous une capture d'écran de votre menu <strong>*#06#</strong> ou de vos réglages. Notre équipe technique vérifiera pour vous.
          </p>

          <a 
            href={`mailto:${ODOO_SUPPORT_EMAIL}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`}
            className="inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-purple-900/50"
          >
            <Mail className="w-5 h-5" />
            Contacter le support
          </a>
          
          <p className="mt-4 text-sm text-gray-400">
            Réponse rapide garantie par notre équipe technique.
          </p>
        </div>
      </div>

    </div>
  );
}
