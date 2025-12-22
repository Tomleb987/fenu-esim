"use client";
import { useState } from "react";
import { Phone, Settings, AlertTriangle, CheckCircle, Smartphone, LifeBuoy, Mail, ArrowRight } from "lucide-react";

/* ------------------------------------------------- 
   CONFIGURATION
--------------------------------------------------*/
const ODOO_EMAIL = "sav@fenua-sim.odoo.com";
const EMAIL_SUBJECT = "Assistance : Vérification compatibilité eSIM";
const EMAIL_BODY = `Bonjour l'équipe Fenuasim,

Je souhaite vérifier si mon téléphone est compatible.
Voici mon modèle exact : 

(Si possible, ajoutez une capture d'écran du résultat *#06#)`;

export default function GuideCompatibilite() {
  const [activeTab, setActiveTab] = useState<"ios" | "android">("ios");

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      
      {/* --- EN-TÊTE --- */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Votre téléphone est-il compatible eSIM ?
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Même si votre modèle est récent, certaines versions étrangères ne sont pas compatibles.
          <span className="block mt-2 font-semibold text-purple-700">Voici comment vérifier en 30 secondes :</span>
        </p>
      </div>

      {/* --- MÉTHODE 1 : LE CODE UNIVERSEL (La plus fiable) --- */}
      <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden mb-12 relative">
        <div className="bg-purple-600 px-6 py-4 text-white flex items-center justify-center gap-2">
          <Phone className="w-6 h-6" />
          <h2 className="text-xl font-bold">Méthode rapide : le code magique</h2>
        </div>
        
        <div className="p-8 md:flex items-center gap-8">
          <div className="flex-1 text-center">
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 inline-block w-full max-w-sm">
              <p className="text-gray-600 mb-2 font-medium">Ouvrez l'app Téléphone et tapez :</p>
              <p className="text-5xl font-black text-purple-700 tracking-widest my-4">*#06#</p>
              <p className="text-sm text-gray-400 italic">(C'est gratuit et instantané)</p>
            </div>
          </div>

          <div className="flex-1 space-y-4 mt-6 md:mt-0">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Résultat immédiat :</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 bg-green-50 p-3 rounded-lg border border-green-200">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-900">
                  <span className="font-bold block">C'est compatible ✅</span>
                  Si vous voyez une ligne avec <strong>"EID"</strong> (un numéro à 32 chiffres).
                </div>
              </li>
              <li className="flex items-start gap-3 bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">
                  <span className="font-bold block">Non compatible ❌</span>
                  Si vous ne voyez que l'IMEI, sans aucune mention "EID".
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* --- MÉTHODE 2 : LES RÉGLAGES (Onglets) --- */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Ou vérifiez dans les réglages</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden mb-16">
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab("ios")}
            className={`flex-1 py-4 font-bold text-lg flex justify-center gap-2 transition-all ${
              activeTab === "ios" 
                ? "bg-white text-purple-700 border-t-4 border-t-purple-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Smartphone className="w-5 h-5" /> iPhone / iPad
          </button>
          <button
            onClick={() => setActiveTab("android")}
            className={`flex-1 py-4 font-bold text-lg flex justify-center gap-2 transition-all ${
              activeTab === "android" 
                ? "bg-white text-purple-700 border-t-4 border-t-purple-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Settings className="w-5 h-5" /> Samsung / Android
          </button>
        </div>

        <div className="p-8 text-left">
          {activeTab === "ios" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-gray-100 w-8 h-8 flex items-center justify-center rounded-full font-bold text-purple-600 flex-shrink-0">1</div>
                <div>
                   <p className="font-semibold">Allez dans Réglages {'>'} Données cellulaires</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-gray-100 w-8 h-8 flex items-center justify-center rounded-full font-bold text-purple-600 flex-shrink-0">2</div>
                <div>
                   <p className="font-semibold">Cherchez le bouton d'ajout</p>
                   <p className="text-gray-600">Si vous voyez l'option <strong>"Ajouter une eSIM"</strong>, c'est tout bon.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-gray-100 w-8 h-8 flex items-center justify-center rounded-full font-bold text-purple-600 flex-shrink-0">1</div>
                <div>
                   <p className="font-semibold">Allez dans Paramètres {'>'} Connexions {'>'} Gestionnaire SIM</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-gray-100 w-8 h-8 flex items-center justify-center rounded-full font-bold text-purple-600 flex-shrink-0">2</div>
                <div>
                   <p className="font-semibold">Vérifiez l'option</p>
                   <p className="text-gray-600">Si vous avez <strong>"Ajouter un forfait mobile"</strong>, votre téléphone est compatible.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- CONTACT SUPPORT (ODOO DIRECT) --- */}
      <div className="bg-gray-900 rounded-3xl p-8 md:p-10 text-center text-white relative overflow-hidden shadow-2xl">
        {/* Déco fond */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 rounded-full opacity-20 blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500 rounded-full opacity-20 blur-3xl -ml-16 -mb-16"></div>
        
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-full mb-6 backdrop-blur-md border border-white/10">
            <LifeBuoy className="w-8 h-8 text-purple-300" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4">Vous avez un doute ? On vérifie pour vous.</h2>
          <p className="text-gray-300 mb-8 text-lg">
            Envoyez une capture d'écran de votre résultat <strong>*#06#</strong> à notre équipe.
            <br className="hidden md:block" /> Nous vous confirmerons la compatibilité rapidement.
          </p>

          <a 
            href={`mailto:${ODOO_EMAIL}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`}
            className="inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-purple-900/50 group"
          >
            <Mail className="w-5 h-5" />
            Demander une vérification
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
          
          <p className="mt-6 text-sm text-gray-500">
            Réponse garantie par l'équipe Fenuasim.
          </p>
        </div>
      </div>

    </div>
  );
}
