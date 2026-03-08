"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronDown, LifeBuoy, Mail, ArrowRight, Search,
  Smartphone, Wifi, Globe, AlertCircle, ShoppingBag,
  MessageCircle, CheckCircle, Zap, RefreshCw
} from "lucide-react";

const ODOO_EMAIL = "sav@fenua-sim.odoo.com";
const EMAIL_SUBJECT = "Question : Demande d'informations générales";
const EMAIL_BODY = `Bonjour l'équipe Fenuasim,

Je n'ai pas trouvé la réponse à ma question dans la FAQ.
Voici ma demande : 

`;

type Category = "general" | "installation" | "usage" | "depannage";

interface FaqItem {
  category: Category;
  question: string;
  answer: React.ReactNode;
  tag?: string;
}

const FAQS: FaqItem[] = [
  // --- GÉNÉRAL ---
  {
    category: "general",
    question: "Qu'est-ce qu'une eSIM exactement ?",
    tag: "Essentiel",
    answer: (
      <span>
        Une eSIM est une carte SIM <strong>directement intégrée</strong> dans votre téléphone — pas de tiroir à ouvrir, pas de carte à insérer, pas d'attente postale. Vous commandez en ligne, recevez un QR code par email, vous scannez, et vous êtes connecté en 2 minutes chrono.
      </span>
    ),
  },
  {
    category: "general",
    question: "Mon téléphone est-il compatible ?",
    tag: "Essentiel",
    answer: (
      <span>
        La plupart des smartphones récents le sont — iPhone XR et ultérieurs, Samsung Galaxy S20+, Pixel 4 et plus. La méthode la plus rapide : ouvrez l'app Téléphone et tapez <strong>*#06#</strong>. Si vous voyez un numéro "EID", votre téléphone supporte l'eSIM.{" "}
        <Link href="/compatibilite" className="text-purple-600 font-bold hover:underline">
          Vérifier en détail →
        </Link>
      </span>
    ),
  },
  {
    category: "general",
    question: "Je garde mon numéro et WhatsApp ?",
    tag: "Très demandé",
    answer: (
      <span>
        <strong>Oui, absolument.</strong> L'eSIM gère uniquement vos données mobiles (internet). Votre SIM principale reste en place — votre numéro habituel continue de recevoir appels et SMS, WhatsApp, Telegram, iMessage fonctionnent normalement. Vos contacts ne voient aucune différence.
      </span>
    ),
  },
  {
    category: "general",
    question: "L'eSIM peut-elle remplacer ma SIM principale ?",
    answer: (
      <span>
        Non, et c'est fait exprès. L'eSIM FenuaSIM est conçue pour les <strong>données mobiles en voyage</strong> uniquement. Gardez votre SIM habituelle pour les appels et SMS — c'est la configuration idéale : connexion locale rapide + numéro habituel joignable.
      </span>
    ),
  },
  {
    category: "general",
    question: "Dans combien de pays ça fonctionne ?",
    answer: (
      <span>
        Nos forfaits couvrent <strong>+180 pays</strong> selon la destination choisie. Certains forfaits sont spécifiques à un pays, d'autres couvrent une région entière (Europe, Asie, Monde). Vérifiez la couverture directement sur la page du forfait.{" "}
        <Link href="/shop" className="text-purple-600 font-bold hover:underline">
          Voir les destinations →
        </Link>
      </span>
    ),
  },

  // --- INSTALLATION ---
  {
    category: "installation",
    question: "Quand installer mon eSIM ?",
    tag: "Essentiel",
    answer: (
      <span>
        <strong>Avant de partir, chez vous, en Wi-Fi.</strong> C'est le timing idéal — connexion stable, pas de stress, 2 minutes suffisent. L'eSIM restera en veille jusqu'à votre arrivée. La durée du forfait démarre uniquement à la première connexion à l'étranger, pas à l'installation.{" "}
        <Link href="/blog/quand-installer-esim" className="text-purple-600 font-bold hover:underline">
          En savoir plus →
        </Link>
      </span>
    ),
  },
  {
    category: "installation",
    question: "Ai-je besoin du Wi-Fi pour installer l'eSIM ?",
    answer: (
      <span>
        <strong>Oui, pour l'installation uniquement.</strong> Le scan du QR code et le téléchargement du profil eSIM nécessitent une connexion internet (Wi-Fi ou 4G). Une fois installée, l'eSIM fonctionne de manière autonome — plus besoin de Wi-Fi.
      </span>
    ),
  },
  {
    category: "installation",
    question: "Comment scanner le QR code si je n'ai qu'un seul téléphone ?",
    tag: "Astuce",
    answer: (
      <span>
        Bonne question ! Vous ne pouvez pas pointer votre caméra vers votre propre écran. <strong>Solution :</strong> ouvrez l'email sur un ordinateur ou une tablette, puis scannez depuis votre téléphone. Pas d'autre appareil ? Faites une capture d'écran du QR code et utilisez l'option <strong>"Entrer les détails manuellement"</strong> dans vos réglages — le code de confirmation est toujours inclus dans l'email.
      </span>
    ),
  },
  {
    category: "installation",
    question: "Je suis déjà à l'étranger, je peux quand même commander ?",
    answer: (
      <span>
        Oui, à condition d'avoir accès au Wi-Fi (hôtel, café, aéroport) pour recevoir et scanner le QR code. La commande est traitée immédiatement — vous recevez le QR code en quelques minutes.
      </span>
    ),
  },

  // --- UTILISATION ---
  {
    category: "usage",
    question: "Le partage de connexion (hotspot) fonctionne ?",
    tag: "Très demandé",
    answer: (
      <span>
        <strong>Oui, sur la plupart de nos forfaits.</strong> Vous pouvez partager votre connexion avec un ordinateur, une tablette ou d'autres téléphones. Attention : le hotspot consomme beaucoup plus vite que l'usage solo. Prévoyez un forfait généreux ou illimité si c'est votre usage principal.{" "}
        <Link href="/blog/esim-partage-connexion-hotspot" className="text-purple-600 font-bold hover:underline">
          Guide hotspot →
        </Link>
      </span>
    ),
  },
  {
    category: "usage",
    question: "Comment suivre ma consommation ?",
    answer: (
      <span>
        Directement dans les réglages de votre téléphone : <strong>Réglages → Données cellulaires</strong> (iPhone) ou <strong>Paramètres → Réseau → Utilisation des données</strong> (Android). Vous pouvez aussi consulter votre espace client FenuaSIM pour voir le solde restant en temps réel.
      </span>
    ),
  },
  {
    category: "usage",
    question: "Combien de Go faut-il pour mon voyage ?",
    tag: "Astuce",
    answer: (
      <span>
        Tout dépend de votre usage. En résumé : <strong>10 Go</strong> pour un usage léger (Maps, messages, réseaux sociaux), <strong>20 Go</strong> pour un usage standard sur 2-3 semaines, <strong>illimité</strong> si vous regardez des vidéos ou utilisez le hotspot. En cas de doute, prenez le forfait supérieur.{" "}
        <Link href="/blog/combien-de-go-voyage" className="text-purple-600 font-bold hover:underline">
          Le guide complet →
        </Link>
      </span>
    ),
  },
  {
    category: "usage",
    question: "Puis-je recharger mon forfait en cours de voyage ?",
    answer: (
      <span>
        <strong>Oui.</strong> Si vous manquez de data ou prolongez votre séjour, connectez-vous à votre espace client et achetez une recharge (Top-up). Elle s'ajoute automatiquement à votre eSIM existante — pas besoin de réinstaller quoi que ce soit.
      </span>
    ),
  },

  // --- DÉPANNAGE ---
  {
    category: "depannage",
    question: "Je n'ai pas internet à l'arrivée, que faire ?",
    tag: "Essentiel",
    answer: (
      <span>
        Vérifiez ces 3 points dans cet ordre :{" "}
        <strong>1)</strong> Données mobiles = ligne eSIM sélectionnée.{" "}
        <strong>2)</strong> Itinérance (roaming) activée sur la ligne eSIM.{" "}
        <strong>3)</strong> Mode avion 10 secondes puis OFF pour forcer la reconnexion.
        Si ça ne suffit pas, notre checklist complète couvre 7 causes et leurs solutions.{" "}
        <Link href="/blog/depannage-esim-pas-de-reseau" className="text-purple-600 font-bold hover:underline">
          Checklist complète →
        </Link>
      </span>
    ),
  },
  {
    category: "depannage",
    question: "J'ai supprimé mon eSIM par erreur !",
    answer: (
      <span>
        <strong>Contactez-nous immédiatement.</strong> Un QR code ne peut généralement être scanné qu'une seule fois. Selon votre forfait, notre équipe peut vérifier s'il est possible de réactiver votre profil ou de procéder à un remplacement. N'attendez pas — plus tôt vous nous contactez, plus vite on règle ça.
      </span>
    ),
  },
  {
    category: "depannage",
    question: "La connexion est lente (3G au lieu de 4G)",
    answer: (
      <span>
        <strong>Mode avion 10 secondes → OFF.</strong> Ça force le téléphone à se reconnecter à la meilleure antenne disponible. Si le problème persiste, vérifiez dans vos réglages que la sélection réseau est bien en <strong>automatique</strong> — un opérateur manuel sélectionné dans un autre pays peut bloquer la connexion 4G.
      </span>
    ),
  },
];

const CATEGORIES: { id: Category | "all"; label: string; icon: React.ElementType; color: string }[] = [
  { id: "all",          label: "Tout voir",    icon: Globe,          color: "text-gray-600" },
  { id: "general",      label: "Général",      icon: MessageCircle,  color: "text-purple-600" },
  { id: "installation", label: "Installation", icon: Smartphone,     color: "text-blue-600" },
  { id: "usage",        label: "Utilisation",  icon: Wifi,           color: "text-emerald-600" },
  { id: "depannage",    label: "Dépannage",    icon: AlertCircle,    color: "text-orange-600" },
];

const TAG_STYLES: Record<string, string> = {
  "Essentiel":    "bg-purple-50 text-purple-700 border-purple-100",
  "Très demandé": "bg-orange-50 text-orange-700 border-orange-100",
  "Astuce":       "bg-emerald-50 text-emerald-700 border-emerald-100",
};

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        q.length === 0 ||
        faq.question.toLowerCase().includes(q) ||
        (typeof faq.answer === "string" && faq.answer.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const toggleFAQ = (index: number) => setOpenIndex(openIndex === index ? null : index);

  const activeCat = CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">

        {/* ── EN-TÊTE ───────────────────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-xs font-bold text-purple-700 mb-4">
            <LifeBuoy className="w-3.5 h-3.5" />
            Centre d'aide
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Des questions ?<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-500">On a les réponses.</span>
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto text-lg">
            Tout ce qu'il faut savoir pour utiliser votre eSIM sans stress, du premier scan à l'atterrissage.
          </p>
        </div>

        {/* ── STATS RAPIDES ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: <Zap className="w-5 h-5 text-purple-600" />, value: "2 min", label: "Installation" },
            { icon: <Globe className="w-5 h-5 text-emerald-600" />, value: "+180", label: "Pays couverts" },
            { icon: <CheckCircle className="w-5 h-5 text-orange-500" />, value: "FR", label: "Support français" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
              <div className="flex justify-center mb-2">{s.icon}</div>
              <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── RECHERCHE ─────────────────────────────────────────────────────── */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setOpenIndex(null); }}
            placeholder="Rechercher : hotspot, WhatsApp, installation…"
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── FILTRES ───────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); }}
                className={[
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all",
                  active
                    ? "bg-gray-900 text-white border-gray-900 shadow-md"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900",
                ].join(" ")}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "text-white" : cat.color}`} />
                {cat.label}
                <span className={`text-xs ${active ? "opacity-70" : "opacity-50"}`}>
                  ({FAQS.filter((f) => cat.id === "all" || f.category === cat.id).length})
                </span>
              </button>
            );
          })}
        </div>

        {/* ── LISTE FAQ ─────────────────────────────────────────────────────── */}
        <div className="space-y-3 mb-14">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-500 font-medium">Aucune réponse pour "{searchQuery}"</p>
              <button onClick={() => setSearchQuery("")} className="mt-3 text-purple-600 text-sm font-bold hover:underline">
                Effacer la recherche
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const realIndex = FAQS.indexOf(faq);
              const isOpen = openIndex === realIndex;
              return (
                <div
                  key={realIndex}
                  className={[
                    "rounded-2xl border bg-white transition-all duration-200 overflow-hidden",
                    isOpen
                      ? "border-purple-200 shadow-md ring-1 ring-purple-100"
                      : "border-gray-200 hover:border-purple-200 hover:shadow-sm",
                  ].join(" ")}
                >
                  <button
                    onClick={() => toggleFAQ(realIndex)}
                    className="w-full flex items-start justify-between gap-4 px-6 py-5 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      {faq.tag && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border mb-2 ${TAG_STYLES[faq.tag]}`}>
                          {faq.tag}
                        </span>
                      )}
                      <p className={`font-semibold text-base leading-snug ${isOpen ? "text-purple-800" : "text-gray-800"}`}>
                        {faq.question}
                      </p>
                    </div>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${isOpen ? "bg-purple-100" : "bg-gray-100"}`}>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180 text-purple-600" : "text-gray-500"}`} />
                    </div>
                  </button>

                  <div className={`transition-all duration-300 ease-in-out ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className="px-6 pb-6 text-gray-600 text-sm leading-relaxed border-t border-gray-50 pt-4">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── CTA SHOP ──────────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-orange-50 border border-purple-100 p-7 flex flex-col sm:flex-row items-center gap-6 mb-6">
          <div className="flex-1">
            <p className="font-extrabold text-gray-900 text-lg mb-1">Prêt à partir connecté ?</p>
            <p className="text-gray-500 text-sm">Forfaits eSIM dans +180 pays. Activation en 2 minutes.</p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition-all shadow-md shadow-purple-200 whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4" />
            Choisir mon eSIM
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* ── SUPPORT ───────────────────────────────────────────────────────── */}
        <div className="bg-gray-950 rounded-3xl p-8 md:p-10 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600 rounded-full opacity-10 blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-500 rounded-full opacity-10 blur-3xl -ml-20 -mb-20 pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-full mb-5 border border-white/10">
              <LifeBuoy className="w-7 h-7 text-purple-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Vous n'avez pas trouvé votre réponse ?</h2>
            <p className="text-gray-400 mb-7 leading-relaxed">
              Notre équipe vous répond en français. Décrivez votre situation et on vous guide pas à pas.
            </p>
            <a
              href={`mailto:${ODOO_EMAIL}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`}
              className="inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold text-base transition-all hover:scale-[1.02] shadow-lg shadow-purple-900/40 group"
            >
              <Mail className="w-5 h-5" />
              Écrire au support
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <p className="mt-4 text-xs text-gray-600">Réponse garantie par l'équipe Fenuasim.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
