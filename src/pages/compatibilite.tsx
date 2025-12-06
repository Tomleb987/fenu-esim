"use client";
import { useState } from "react";
import { Phone, Settings, AlertTriangle, CheckCircle, Smartphone } from "lucide-react"; // Assure-toi d'avoir lucide-react ou utilise des emojis

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
          Même si votre modèle est récent, certaines versions régionales (Chine, Hong Kong, etc.) ne sont pas compatibles. 
          <span className="font-semibold text-purple-700"> La seule façon d'être sûr à 100% est de vérifier votre appareil.</span>
        </p>
      </div>

      {/* -------------------------------------------------
          MÉTHODE 1 : LE CODE UNIVERSEL (Le plus fiable)
         -------------------------------------------------- */}
      <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden mb-12 relative">
        <div className="bg-purple-600 px-6 py-4 text-white flex items-center justify-center gap-2">
          <Phone className="w-6 h-6" />
          <h2 className="text-xl font-bold">Méthode rapide : le code magique</h2>
        </div>
        
        <div className="p-8 md:flex items-center gap-8">
          <div className="flex-1">
             
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 text-center mb-4">
              <p className="text-gray-600 mb-2 font-medium">Ouvrez votre application téléphone et tapez :</p>
              <p className="text-5xl font-black text-purple-700 tracking-widest my-4">*#06#</p>
              <p className="text-sm text-gray-500">(Comme pour passer un appel)</p>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <h3 className="text-xl font-bold text-gray-800">Comment interpréter le résultat ?</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 bg-green-50 p-4 rounded-lg border border-green-200">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-green-800">C'est compatible !</span>
                  <span className="text-sm text-green-700">
                    Si vous voyez une ligne mentionnant <strong>EID</strong> (un numéro long de 32 chiffres).
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3 bg-red-50 p-4 rounded-lg border border-red-200">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-red-800">Ce n'est pas compatible</span>
                  <span className="text-sm text-red-700">
                    Si vous ne voyez que des lignes IMEI ou MEID, sans mention de EID.
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------
          MÉTHODE 2 : VÉRIFICATION DANS LES RÉGLAGES
         -------------------------------------------------- */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ou vérifiez dans les réglages</h2>
        <p className="text-gray-500">Sélectionnez votre type d'appareil pour voir le tutoriel pas à pas.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
        {/* Onglets */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("ios")}
            className={`flex-1 py-4 text-center font-bold text-lg transition-colors flex items-center justify-center gap-2
              ${activeTab === "ios" ? "bg-purple-50 text-purple-700 border-b-4 border-purple-600" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <Smartphone className="w-5 h-5" /> iPhone / iPad
          </button>
          <button
            onClick={() => setActiveTab("android")}
            className={`flex-1 py-4 text-center font-bold text-lg transition-colors flex items-center justify-center gap-2
              ${activeTab === "android" ? "bg-purple-50 text-purple-700 border-b-4 border-purple-600" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <Settings className="w-5 h-5" /> Samsung / Google / Android
          </button>
        </div>

        {/* Contenu iOS */}
        {activeTab === "ios" && (
          <div className="p-8">
            
            <h3 className="text-xl font-bold mb-6">Sur un appareil Apple</h3>
            <ol className="space-y-6 relative border-l-2 border-purple-100 ml-3">
              <li className="pl-8 relative">
                <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-purple-600 ring-4 ring-white"></span>
                <p className="font-semibold text-gray-900">Allez dans les Réglages</p>
                <p className="text-gray-600">Ouvrez l'application <strong>Réglages</strong> puis appuyez sur <strong>Données cellulaires</strong> (ou "Données mobiles").</p>
              </li>
              <li className="pl-8 relative">
                <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-purple-600 ring-4 ring-white"></span>
                <p className="font-semibold text-gray-900">Cherchez l'option eSIM</p>
                <p className="text-gray-600">
                  Si vous voyez l'option <strong>"Ajouter une eSIM"</strong> ou <strong>"Ajouter un forfait cellulaire"</strong>, votre iPhone est compatible.
                </p>
              </li>
              <li className="pl-8 relative">
                <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-orange-400 ring-4 ring-white"></span>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mt-2">
                  <span className="text-orange-800 text-sm font-semibold">Note importante :</span>
                  <p className="text-orange-700 text-sm">
                    Si votre téléphone est bloqué par un opérateur (simlocké), vous ne pourrez peut-être pas installer d'eSIM d'un autre fournisseur.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Contenu Android */}
        {activeTab === "android" && (
          <div className="p-8">
             
            <h3 className="text-xl font-bold mb-6">Sur Samsung, Google Pixel et autres</h3>
            <ol className="space-y-6 relative border-l-2 border-purple-100 ml-3">
              <li className="pl-8 relative">
                <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-purple-600 ring-4 ring-white"></span>
                <p className="font-semibold text-gray-900">Accédez aux Paramètres</p>
                <p className="text-gray-600">
                  Allez dans <strong>Paramètres</strong> {'>'} <strong>Connexions</strong> (ou Réseau et Internet).
                </p>
              </li>
              <li className="pl-8 relative">
                <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-purple-600 ring-4 ring-white"></span>
                <p className="font-semibold text-gray-900">Gestionnaire de carte SIM</p>
                <p className="text-gray-600">
                  Cliquez sur <strong>Gestionnaire de carte SIM</strong> (ou SIMs).
                </p>
              </li>
              <li className="pl-8 relative">
                <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-purple-600 ring-4 ring-white"></span>
                <p className="font-semibold text-gray-900">Vérifiez l'option</p>
                <p className="text-gray-600">
                  Si vous avez une option <strong>"Ajouter un forfait mobile"</strong> ou <strong>"Ajouter une eSIM"</strong>, c'est gagné !
                </p>
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
