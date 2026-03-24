// ============================================================
// FENUA SIM – Page FENUASIMBOX
// src/pages/fenuasimbox.tsx
// ============================================================

import { useState } from "react";
import Head from "next/head";
import Image from "next/image";
import { Wifi, Shield, Battery, Globe, CheckCircle, ArrowRight, Smartphone, Briefcase, Users, PiggyBank } from "lucide-react";

const G = "linear-gradient(135deg, #A020F0 0%, #FF4D6D 50%, #FF7F11 100%)";

export default function FenuaSimBox() {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    arrivalDate: "", departureDate: "", destination: "",
    travelers: "1", message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [currency, setCurrency] = useState<"eur" | "xpf">("eur");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const nights = form.arrivalDate && form.departureDate
    ? Math.max(0, Math.round((new Date(form.departureDate).getTime() - new Date(form.arrivalDate).getTime()) / 86400000))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.arrivalDate || !form.departureDate) {
      setErrorMsg("Merci de remplir tous les champs obligatoires."); return;
    }
    if (new Date(form.departureDate) <= new Date(form.arrivalDate)) {
      setErrorMsg("La date de départ doit être après la date d'arrivée."); return;
    }
    setStatus("sending"); setErrorMsg("");
    try {
      const res = await fetch("/api/fenuasimbox-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Une erreur est survenue. Réessaie ou contacte-nous directement.");
    }
  };

  const inputCls = "w-full text-sm px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all";
  const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";

  return (
    <>
      <Head>
        <title>FENUASIM BOX — Routeur WiFi de voyage | FENUA SIM</title>
        <meta name="description" content="Pas de téléphone compatible eSIM ? En famille, en business ou petit budget ? Louez la FENUASIM BOX — routeur WiFi portable à partager. 10€/jour, caution 67€ remboursable." />
        <link rel="canonical" href="https://www.fenuasim.com/fenuasimbox" />
      </Head>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a0533 0%, #2d0a5e 60%, #1a0533 100%)" }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 15% 50%, #A020F0 0%, transparent 50%), radial-gradient(circle at 85% 20%, #FF7F11 0%, transparent 50%)"
        }} />
        <div className="relative max-w-5xl mx-auto px-4 py-16">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            {/* Texte */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
                <Wifi size={13} /> Routeur WiFi portable · Location
              </div>
              <h1 className="text-4xl sm:text-6xl font-bold text-white mb-4">
                FENUASIM <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>BOX</span>
              </h1>
              <p className="text-xl text-white/80 max-w-xl mb-4 font-medium">
                Une seule connexion pour toute votre équipe, famille ou groupe.
              </p>
              <p className="text-base text-white/60 max-w-lg mb-10">
                Téléphone non compatible eSIM ? Voyage en famille ? Petit budget à partager ?
                La FENUASIM BOX est faite pour vous.
              </p>
              <a href="#formulaire"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-semibold text-base shadow-lg hover:opacity-90 transition-opacity"
                style={{ background: G }}>
                Faire une demande <ArrowRight size={18} />
              </a>
            </div>

            {/* Image */}
            <div className="flex-1 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md">
                {/* Halo coloré derrière l'image */}
                <div className="absolute inset-0 rounded-full opacity-40 blur-3xl scale-75" style={{ background: G }} />
                <Image
                  src="/images/fenuasimbox.png"
                  alt="FENUASIM BOX — Routeur WiFi portable"
                  width={520}
                  height={520}
                  className="relative z-10 w-full h-auto"
                  style={{
                    objectFit: "contain",
                    mixBlendMode: "luminosity",
                    filter: "brightness(1.1) contrast(1.05)",
                    maskImage: "radial-gradient(ellipse 90% 85% at 50% 45%, black 55%, transparent 100%)",
                    WebkitMaskImage: "radial-gradient(ellipse 90% 85% at 50% 45%, black 55%, transparent 100%)",
                  }}
                  priority
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 4 profils cibles */}
      <div className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-3">La FENUASIM BOX, c'est pour vous si…</h2>
          <p className="text-center text-gray-500 text-sm mb-10">4 situations où la BOX est la meilleure solution</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: Smartphone,
                title: "Votre téléphone n'est pas compatible eSIM",
                desc: "Tous les appareils ne supportent pas encore l'eSIM — iPhone anciens, Android entrée de gamme, appareils photo, tablettes... La BOX vous connecte tous, sans exception.",
                tag: "Compatibilité universelle",
                color: "#A020F0",
              },
              {
                icon: Briefcase,
                title: "Vous voyagez pour le business",
                desc: "Restez joignable en permanence, connectez votre ordinateur et votre téléphone simultanément. Idéal pour les déplacements professionnels en Polynésie et à l'international.",
                tag: "Voyage business",
                color: "#FF4D6D",
              },
              {
                icon: Users,
                title: "Vous partez en famille avec des enfants",
                desc: "Connectez jusqu'à 8 appareils en même temps — tablettes, téléphones, consoles... Chaque membre de la famille reste connecté sans multiplier les abonnements.",
                tag: "Famille & groupe",
                color: "#FF7F11",
              },
              {
                icon: PiggyBank,
                title: "Vous cherchez à partager les frais",
                desc: "Pourquoi payer une eSIM par personne ? Partagez une seule connexion entre 2, 3 ou 4 voyageurs et divisez le coût. La solution la plus économique pour voyager connecté.",
                tag: "Petit budget",
                color: "#0EA896",
              },
            ].map(({ icon: Icon, title, desc, tag, color }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "20" }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <div>
                  <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2" style={{ background: color + "15", color }}>
                    {tag}
                  </span>
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm leading-snug">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Caractéristiques */}
      <div className="bg-gray-50 py-14">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">Ce que vous obtenez</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {[
              { icon: Wifi,    title: "Jusqu'à 8 appareils",   desc: "Connectés simultanément" },
              { icon: Globe,   title: "Partout dans le monde", desc: "International" },
              { icon: Battery, title: "12h d'autonomie",       desc: "Batterie longue durée" },
              { icon: Shield,  title: "Caution 8 000 XPF",     desc: "≈ 67 € · Remboursée au retour" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: G }}>
                  <Icon size={20} className="text-white" />
                </div>
                <p className="font-semibold text-gray-800 text-sm mb-1">{title}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tarifs */}
      <div className="bg-white py-14">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tarifs transparents</h2>
          <p className="text-gray-500 text-sm mb-8">Partagez le coût à plusieurs et la connexion devient encore plus économique</p>
          {/* Sélecteur de devise */}
          <div className="flex justify-center gap-2 mb-8">
            {(["eur", "xpf"] as const).map(c => (
              <button key={c} onClick={() => setCurrency(c)}
                className={"px-6 py-2 rounded-xl text-sm font-semibold border transition-all " + (currency === c ? "text-white border-transparent shadow-sm" : "text-gray-500 border-gray-200 bg-white hover:border-purple-200")}
                style={currency === c ? { background: G } : {}}>
                {c === "eur" ? "€ EUR" : "XPF"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              {
                label: "Location",
                value: currency === "eur" ? "10 €/jour" : "1 193 XPF/j",
                sub: "Quel que soit le nombre d'appareils"
              },
              {
                label: "Caution",
                value: currency === "eur" ? "67 €" : "8 000 XPF",
                sub: "Remboursée au retour en bon état"
              },
              {
                label: "À 4 voyageurs",
                value: currency === "eur" ? "2,50 €/j" : "298 XPF/j",
                sub: "Par personne en partageant"
              },
            ].map(t => (
              <div key={t.label} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t.label}</p>
                <p className="text-2xl font-bold mb-1" style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{t.value}</p>
                <p className="text-xs text-gray-400">{t.sub}</p>
              </div>
            ))}
          </div>
          <div className="bg-purple-50 rounded-xl px-6 py-4 text-sm text-purple-700 inline-block">
            {currency === "eur"
              ? <span>💡 Exemple : 7 nuits à 4 personnes = <strong>70 € de location</strong> soit <strong>17,50 € par personne</strong> (caution 67 € remboursée)</span>
              : <span>💡 Exemple : 7 nuits à 4 personnes = <strong>8 351 XPF de location</strong> soit <strong>2 088 XPF par personne</strong> (caution 8 000 XPF remboursée)</span>
            }
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div id="formulaire" className="bg-gray-50 py-16">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Faire une demande</h2>
            <p className="text-gray-500 text-sm">Aucun paiement à ce stade — on vous répond sous 24h pour confirmer la disponibilité.</p>
          </div>

          {status === "success" ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée ✅</h3>
              <p className="text-gray-500 text-sm mb-6">
                Merci <strong>{form.firstName}</strong> ! Nous avons bien reçu votre demande et vous répondrons sous 24h à <strong>{form.email}</strong>.
              </p>
              <button onClick={() => { setStatus("idle"); setForm({ firstName: "", lastName: "", email: "", phone: "", arrivalDate: "", departureDate: "", destination: "", travelers: "1", message: "" }); }}
                className="text-sm px-6 py-3 rounded-xl text-white font-medium" style={{ background: G }}>
                Nouvelle demande
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Prénom *</label>
                  <input type="text" value={form.firstName} onChange={e => set("firstName", e.target.value)} className={inputCls} placeholder="Jean" required />
                </div>
                <div>
                  <label className={labelCls}>Nom *</label>
                  <input type="text" value={form.lastName} onChange={e => set("lastName", e.target.value)} className={inputCls} placeholder="Dupont" required />
                </div>
              </div>

              <div>
                <label className={labelCls}>Email *</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={inputCls} placeholder="jean.dupont@email.com" required />
              </div>

              <div>
                <label className={labelCls}>Téléphone</label>
                <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} className={inputCls} placeholder="+689 XX XX XX XX" />
              </div>

              <div className="border-t border-gray-100 pt-5">
                <p className="text-sm font-semibold text-gray-700 mb-4">Votre séjour</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={labelCls}>Date d'arrivée *</label>
                    <input type="date" value={form.arrivalDate} onChange={e => set("arrivalDate", e.target.value)}
                      min={new Date().toISOString().slice(0, 10)} className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>Date de départ *</label>
                    <input type="date" value={form.departureDate} onChange={e => set("departureDate", e.target.value)}
                      min={form.arrivalDate || new Date().toISOString().slice(0, 10)} className={inputCls} required />
                  </div>
                </div>

                {nights > 0 && (
                  <div className="bg-purple-50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                    <span className="text-sm text-purple-700 font-medium">{nights} nuit{nights > 1 ? "s" : ""}</span>
                    <span className="text-xs text-purple-500">Un devis vous sera envoyé par email</span>
                  </div>
                )}

                <div>
                  <label className={labelCls}>Destination</label>
                  <input type="text" value={form.destination} onChange={e => set("destination", e.target.value)}
                    className={inputCls} placeholder="Ex : Bora Bora, Moorea, Japon, Europe..." />
                </div>
              </div>

              <div>
                <label className={labelCls}>Nombre de voyageurs</label>
                <select value={form.travelers} onChange={e => set("travelers", e.target.value)} className={inputCls}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>
                      {n} personne{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Message (optionnel)</label>
                <textarea value={form.message} onChange={e => set("message", e.target.value)}
                  className={inputCls} rows={3}
                  placeholder="Questions particulières, téléphone non compatible, besoins spécifiques..." />
              </div>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{errorMsg}</div>
              )}

              <button type="submit" disabled={status === "sending"}
                className="w-full py-4 rounded-xl text-white font-semibold text-base shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: G }}>
                {status === "sending" ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi en cours…</>
                ) : (
                  <>Envoyer ma demande <ArrowRight size={18} /></>
                )}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Aucun paiement requis · Réponse sous 24h · Disponibilité confirmée par email
              </p>
            </form>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white py-12">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Questions fréquentes</h2>
          <div className="space-y-4">
            {[
              { q: "Mon téléphone n'est pas compatible eSIM — la BOX fonctionne quand même ?", r: "Oui, c'est exactement pour ça qu'elle existe. La FENUASIM BOX fonctionne de manière totalement indépendante de votre téléphone. Elle crée un réseau WiFi auquel vous vous connectez comme à la maison." },
              { q: "Combien d'appareils peut-on connecter simultanément ?", r: "Jusqu'à 8 appareils en même temps — téléphones, tablettes, ordinateurs, consoles... Idéal pour toute une famille ou équipe." },
              { q: "Comment fonctionne la caution ?", r: "Une caution de 8 000 XPF (≈ 67 €) est demandée à la remise du routeur. Elle est intégralement remboursée au retour en bon état, sans délai ni justification." },
              { q: "Peut-on utiliser la BOX à l'international ?", r: "Oui. Il suffit d'y insérer une eSIM FENUA SIM adaptée à votre destination. Nous pouvons vous conseiller sur le forfait le plus adapté." },
              { q: "Comment récupère-t-on le routeur ?", r: "Nous vous indiquons le point de remise dans notre email de confirmation. Une remise en main propre sur rendez-vous est également possible." },
            ].map(({ q, r }) => (
              <div key={q} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <p className="font-semibold text-gray-800 mb-2 text-sm">{q}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{r}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
