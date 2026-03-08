"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Phone, Settings, AlertTriangle, CheckCircle, Smartphone,
  LifeBuoy, Mail, ArrowRight, Lock, ShoppingBag, ChevronDown
} from "lucide-react";

const ODOO_EMAIL = "sav@fenua-sim.odoo.com";
const EMAIL_SUBJECT = "Assistance : Vérification compatibilité eSIM";
const EMAIL_BODY = `Bonjour l'équipe Fenuasim,

Je souhaite vérifier si mon téléphone est compatible.
Voici mon modèle exact : 

(Si possible, ajoutez une capture d'écran du résultat *#06#)`;

type Tab = "ios" | "samsung" | "pixel" | "other";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "ios",     label: "iPhone",  icon: <Smartphone className="w-4 h-4" /> },
  { id: "samsung", label: "Samsung", icon: <Settings className="w-4 h-4" /> },
  { id: "pixel",   label: "Pixel",   icon: <Settings className="w-4 h-4" /> },
  { id: "other",   label: "Autres",  icon: <Settings className="w-4 h-4" /> },
];

function Step({ n, title, desc }: { n: number; title: string; desc?: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-extrabold text-sm flex items-center justify-center flex-shrink-0">
        {n}
      </div>
      <div>
        <p className="font-semibold text-gray-800">{title}</p>
        {desc && <p className="text-gray-500 text-sm mt-0.5">{desc}</p>}
      </div>
    </div>
  );
}

export default function GuideCompatibilite() {
  const [activeTab, setActiveTab] = useState<Tab>("ios");
  const [simLockOpen, setSimLockOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto py-16 px-4 space-y-12">

      {/* ── EN-TÊTE ─────────────────────────────────────────────────────────── */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-xs font-bold text-purple-700 mb-4">
          <Smartphone className="w-3.5 h-3.5" />
          Vérification en 30 secondes
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          Votre téléphone est-il<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-500">compatible eSIM ?</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
          Même si votre modèle est récent, certaines versions étrangères ne sont pas compatibles.
          Voici comment le savoir en moins d'une minute.
        </p>
      </div>

      {/* ── MÉTHODE 1 : CODE *#06# ──────────────────────────────────────────── */}
      <div className="rounded-3xl border border-purple-100 bg-white shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Méthode recommandée</p>
            <h2 className="text-white text-lg font-extrabold">Le code universel</h2>
          </div>
        </div>

        <div className="p-8 md:flex items-center gap-10">
          {/* Code */}
          <div className="flex-1 text-center mb-8 md:mb-0">
            <div className="inline-block bg-gray-950 rounded-2xl px-10 py-8 shadow-xl">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">Composez</p>
              <p className="text-5xl font-black text-white tracking-[0.2em] font-mono">*#06#</p>
              <p className="text-gray-500 text-xs mt-3">Gratuit · Instantané · Pas d'appel</p>
            </div>
          </div>

          {/* Résultats */}
          <div className="flex-1 space-y-3">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Résultat immédiat</p>
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-bold text-emerald-900 block mb-1">Compatible ✅</span>
                <span className="text-emerald-800">Vous voyez une ligne <strong>"EID"</strong> — un numéro de 32 chiffres. Votre téléphone supporte l'eSIM.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-4 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-bold text-red-900 block mb-1">Non compatible ❌</span>
                <span className="text-red-800">Vous ne voyez que l'IMEI, sans mention "EID". L'eSIM n'est pas disponible sur ce modèle.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ALERTE VERROUILLAGE OPÉRATEUR ───────────────────────────────────── */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
        <button
          onClick={() => setSimLockOpen(!simLockOpen)}
          className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-900">Votre téléphone est-il déverrouillé ?</p>
              <p className="text-amber-700 text-sm">Un téléphone compatible eSIM peut quand même être bloqué sur un opérateur.</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-amber-600 flex-shrink-0 transition-transform ${simLockOpen ? "rotate-180" : ""}`} />
        </button>

        {simLockOpen && (
          <div className="px-6 pb-6 space-y-4 border-t border-amber-200 pt-5">
            <p className="text-amber-900 text-sm leading-relaxed">
              Un téléphone acheté via un abonnement opérateur (Orange, SFR, Bouygues, OPT…) peut être <strong>verrouillé</strong> sur ce réseau. Dans ce cas, même si votre téléphone supporte l'eSIM, il refusera les cartes d'autres opérateurs — y compris les eSIM de voyage.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 border border-amber-100">
                <p className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-purple-600" /> Vérifier sur iPhone
                </p>
                <p className="text-gray-600 text-xs leading-relaxed">
                  Réglages → Général → Informations → <strong>Verrouillage SIM</strong><br />
                  Si c'est indiqué <strong>"Aucun verrouillage SIM"</strong>, vous êtes libre.
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-amber-100">
                <p className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-purple-600" /> Vérifier sur Android
                </p>
                <p className="text-gray-600 text-xs leading-relaxed">
                  Paramètres → À propos du téléphone → Statut → <strong>État du réseau SIM</strong><br />
                  Ou contactez votre opérateur pour demander le déverrouillage.
                </p>
              </div>
            </div>

            <p className="text-amber-800 text-xs bg-amber-100 rounded-xl px-4 py-3">
              💡 En France et dans les DOM-TOM, les opérateurs sont légalement tenus de déverrouiller votre téléphone gratuitement après 3 mois d'abonnement.
            </p>
          </div>
        )}
      </div>

      {/* ── MÉTHODE 2 : RÉGLAGES PAR MARQUE ────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-6">
          Vérifier dans les réglages
        </h2>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Onglets */}
          <div className="flex border-b bg-gray-50 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "flex-1 min-w-[80px] py-4 px-3 font-semibold text-sm flex flex-col items-center gap-1 transition-all border-b-2",
                  activeTab === tab.id
                    ? "bg-white text-purple-700 border-purple-600"
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-white/60",
                ].join(" ")}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-7 space-y-4">
            {activeTab === "ios" && (
              <>
                <Step n={1} title="Réglages → Données cellulaires" />
                <Step n={2} title='Cherchez "Ajouter une eSIM"' desc="Si l'option est présente, votre iPhone est compatible." />
                <Step n={3} title="Vous ne voyez pas l'option ?" desc="Essayez Réglages → Général → Informations → eSIM disponibles." />
              </>
            )}
            {activeTab === "samsung" && (
              <>
                <Step n={1} title="Paramètres → Connexions → Gestionnaire de carte SIM" />
                <Step n={2} title='Cherchez "Ajouter une carte eSIM"' desc="Ou Ajouter un forfait mobile — si présent, votre Samsung est compatible." />
                <Step n={3} title="One UI 5+ ?" desc="Le chemin peut être Paramètres → Connexions → Cartes SIM → Ajouter une eSIM." />
              </>
            )}
            {activeTab === "pixel" && (
              <>
                <Step n={1} title="Paramètres → Réseau et Internet → Cartes SIM" />
                <Step n={2} title='Cherchez "Ajouter une carte SIM"' desc="Puis Télécharger un forfait SIM — si disponible, votre Pixel est compatible." />
                <Step n={3} title="Pixel 3 et ultérieurs sont compatibles" desc="Les Pixel achetés via certains opérateurs américains (Verizon) peuvent être verrouillés." />
              </>
            )}
            {activeTab === "other" && (
              <>
                <Step n={1} title="Paramètres → Réseau & Internet (ou Connexions)" />
                <Step n={2} title='Cherchez "SIM" ou "Carte SIM"' desc='Puis "Ajouter une eSIM" ou "Ajouter un forfait mobile".' />
                <Step n={3} title="Pas sûr ?" desc="Utilisez le code *#06# — c'est la méthode la plus fiable quelle que soit la marque." />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── CTA SHOP SI COMPATIBLE ──────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-7 flex flex-col sm:flex-row items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-emerald-800">Votre téléphone est compatible ?</span>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            Choisissez votre forfait eSIM selon votre destination. Activation en 2 minutes, couverture dans +180 pays.
          </p>
        </div>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md shadow-emerald-200 whitespace-nowrap"
        >
          <ShoppingBag className="w-4 h-4" />
          Choisir mon eSIM
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* ── SUPPORT ─────────────────────────────────────────────────────────── */}
      <div className="bg-gray-950 rounded-3xl p-8 md:p-10 text-center text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600 rounded-full opacity-10 blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-500 rounded-full opacity-10 blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-full mb-6 border border-white/10">
            <LifeBuoy className="w-7 h-7 text-purple-300" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Vous avez un doute ?</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Envoyez une capture d'écran de votre résultat <strong className="text-white">*#06#</strong> à notre équipe. Nous vous confirmons la compatibilité rapidement, en français.
          </p>
          <a
            href={`mailto:${ODOO_EMAIL}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`}
            className="inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold text-base transition-all hover:scale-[1.02] shadow-lg shadow-purple-900/40 group"
          >
            <Mail className="w-5 h-5" />
            Demander une vérification
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <p className="mt-5 text-xs text-gray-600">Réponse garantie par l'équipe Fenuasim.</p>
        </div>
      </div>

    </div>
  );
}
