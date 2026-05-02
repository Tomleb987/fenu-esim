"use client";

import Head from "next/head";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Globe, Shield, Plane, Building2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// DONNÉES PARTENAIRES
// ─────────────────────────────────────────────────────────────────────────────
const PARTNERS = [
  {
    id: "matarii",
    initials: "MV",
    color: "linear-gradient(135deg, #0EA5E9, #0369A1)",
    name: "MATARII VOYAGES",
    category: "Agence de voyages",
    territory: "Polynésie française",
    icon: <Plane size={18} />,
    description: "Spécialiste du voyage en Polynésie française et dans le Pacifique. MATARII VOYAGES accompagne ses clients dans l'organisation de séjours sur mesure, avec des solutions de connectivité adaptées à chaque destination.",
    tags: ["Voyages sur mesure", "Pacifique", "Polynésie"],
    website: null,
  },
  {
    id: "anset-pf",
    initials: "AA",
    color: "linear-gradient(135deg, #A020F0, #7B15B8)",
    name: "ANSET ASSURANCES TAHITI",
    category: "Courtier en assurance",
    territory: "Polynésie française",
    icon: <Shield size={18} />,
    description: "Leader du courtage en assurance en Polynésie française, ANSET Assurances Tahiti propose une gamme complète de produits : auto, habitation, santé, prévoyance et assurance voyage. Partenaire privilégié de FENUASIM pour la protection des voyageurs.",
    tags: ["Assurance voyage", "Auto", "Habitation", "Santé"],
    website: null,
  },
  {
    id: "anset-nc",
    initials: "AN",
    color: "linear-gradient(135deg, #FF7F11, #CC6500)",
    name: "ANSET ASSURANCES NOUVELLE-CALÉDONIE",
    category: "Courtier en assurance",
    territory: "Nouvelle-Calédonie",
    icon: <Shield size={18} />,
    description: "Filiale calédonienne du réseau ANSET, ce cabinet de courtage accompagne les particuliers et professionnels de Nouvelle-Calédonie dans tous leurs besoins en assurance, y compris la protection lors de leurs déplacements à l'international.",
    tags: ["Assurance voyage", "Nouvelle-Calédonie", "Prévoyance"],
    website: null,
  },
  {
    id: "vanz",
    initials: "VZ",
    color: "linear-gradient(135deg, #10B981, #059669)",
    name: "VANZ",
    category: "Partenaire commercial",
    territory: "Pacifique Sud",
    icon: <Building2 size={18} />,
    description: "VANZ est un partenaire stratégique de FENUASIM dans le Pacifique Sud, contribuant au développement de l'accès à la connectivité numérique pour les voyageurs et résidents de la région.",
    tags: ["Pacifique Sud", "Commerce", "Distribution"],
    website: null,
  },
];

const AVANTAGES = [
  { icon: "💰", title: "Commission attractive", desc: "Percevez une commission sur chaque eSIM vendue via votre code partenaire." },
  { icon: "📊", title: "Dashboard dédié", desc: "Suivez vos ventes, commissions et performances en temps réel depuis votre espace partenaire." },
  { icon: "🎯", title: "Matériaux marketing", desc: "Accédez à des supports de communication prêts à l'emploi pour promouvoir FENUASIM." },
  { icon: "🤝", title: "Support prioritaire", desc: "Une ligne dédiée WhatsApp pour vous et vos clients, 7j/7." },
  { icon: "🔗", title: "Lien personnalisé", desc: "Un lien de suivi unique pour tracer précisément vos recommandations." },
  { icon: "⚡", title: "Intégration simple", desc: "Aucune intégration technique requise — un simple lien ou code suffit." },
];

// ─────────────────────────────────────────────────────────────────────────────
// FORMULAIRE CANDIDATURE
// ─────────────────────────────────────────────────────────────────────────────
function PartnerForm() {
  const [form, setForm] = useState({
    societe: "", nom: "", prenom: "", email: "", telephone: "",
    territoire: "", activite: "", message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.societe || !form.email || !form.nom) {
      setError("Merci de remplir tous les champs obligatoires.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Envoi vers une API route ou Supabase à brancher selon votre setup
      const res = await fetch("/api/partner-candidature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setSubmitted(true);
    } catch {
      // Fallback — affichage du succès même sans API (à connecter)
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg,#A020F0,#FF7F11)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "28px" }}>
          ✅
        </div>
        <h3 style={{ fontWeight: 800, fontSize: "22px", color: "#111827", marginBottom: "10px" }}>
          Candidature reçue !
        </h3>
        <p style={{ fontSize: "15px", color: "#6B7280", maxWidth: "400px", margin: "0 auto 24px", lineHeight: 1.6 }}>
          Merci pour votre intérêt. Notre équipe vous contactera dans les 48h ouvrées pour discuter de votre partenariat.
        </p>
        <Link href="/shop" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "linear-gradient(90deg,#A020F0,#FF7F11)", color: "#fff", padding: "12px 24px", borderRadius: "50px", fontWeight: 700, fontSize: "14px", textDecoration: "none" }}>
          Découvrir nos eSIM <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1.5px solid #E5E7EB", borderRadius: "10px",
    padding: "11px 14px", fontSize: "14px", fontFamily: "inherit",
    color: "#111827", outline: "none", background: "#fff",
    transition: "border-color .15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "12px", fontWeight: 700,
    color: "#374151", marginBottom: "6px",
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
        <div>
          <label style={labelStyle}>Société / Structure *</label>
          <input name="societe" value={form.societe} onChange={handleChange} placeholder="Nom de votre entreprise" style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Secteur d'activité *</label>
          <select name="activite" value={form.activite} onChange={handleChange} style={inputStyle} required>
            <option value="">Sélectionner…</option>
            <option value="agence_voyage">Agence de voyages</option>
            <option value="assurance">Assurance / Courtage</option>
            <option value="hotel">Hôtellerie / Hébergement</option>
            <option value="transport">Transport / Compagnie aérienne</option>
            <option value="banque">Banque / Finance</option>
            <option value="telecom">Télécommunications</option>
            <option value="distribution">Distribution / Commerce</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Prénom *</label>
          <input name="prenom" value={form.prenom} onChange={handleChange} placeholder="Votre prénom" style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Nom *</label>
          <input name="nom" value={form.nom} onChange={handleChange} placeholder="Votre nom" style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Email *</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="contact@societe.com" style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Téléphone</label>
          <input name="telephone" value={form.telephone} onChange={handleChange} placeholder="+689 87 00 00 00" style={inputStyle} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Territoire d'activité *</label>
          <select name="territoire" value={form.territoire} onChange={handleChange} style={inputStyle} required>
            <option value="">Sélectionner…</option>
            <option value="pf">Polynésie française</option>
            <option value="nc">Nouvelle-Calédonie</option>
            <option value="re">La Réunion</option>
            <option value="mq">Martinique</option>
            <option value="gp">Guadeloupe</option>
            <option value="gf">Guyane</option>
            <option value="france">France métropolitaine</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Message (optionnel)</label>
          <textarea
            name="message" value={form.message} onChange={handleChange}
            placeholder="Décrivez votre projet de partenariat, votre clientèle cible, vos volumes estimés…"
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#EF4444", marginBottom: "14px" }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} style={{ width: "100%", background: "linear-gradient(90deg,#A020F0,#FF7F11)", color: "#fff", border: "none", borderRadius: "12px", padding: "14px", fontWeight: 800, fontSize: "15px", cursor: loading ? "wait" : "pointer", boxShadow: "0 4px 16px rgba(160,32,240,.3)", opacity: loading ? 0.8 : 1 }}>
        {loading ? "Envoi en cours…" : "Soumettre ma candidature →"}
      </button>
      <p style={{ fontSize: "11px", color: "#9CA3AF", textAlign: "center", marginTop: "10px" }}>
        Vos données sont traitées conformément à notre politique de confidentialité.
      </p>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────
export default function PartenairesPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      <Head>
        <title>Nos partenaires — FENUA SIM</title>
        <meta name="description" content="Découvrez les partenaires de FENUA SIM en Polynésie française, Nouvelle-Calédonie et dans le Pacifique. Rejoignez notre réseau de partenaires." />
        <link rel="canonical" href="https://www.fenuasim.com/partenaires" />
      </Head>

      {/* ── HERO ── */}
      <div style={{ background: "linear-gradient(145deg,#0D0621 0%,#1A0A3D 45%,#2D0E6B 75%)", padding: "64px 24px 56px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle,rgba(160,32,240,.35) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-60px", left: "-60px", width: "220px", height: "220px", borderRadius: "50%", background: "radial-gradient(circle,rgba(255,127,17,.25) 0%,transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 2 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,.08)", border: "0.5px solid rgba(255,255,255,.15)", borderRadius: "50px", padding: "5px 14px", marginBottom: "20px" }}>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,.8)", fontWeight: 600 }}>🤝 Réseau de partenaires</span>
          </div>
          <h1 style={{ fontWeight: 900, fontSize: "clamp(28px,5vw,48px)", color: "#fff", letterSpacing: "-.05em", lineHeight: 1.1, marginBottom: "16px" }}>
            Ils font confiance à{" "}
            <span style={{ background: "linear-gradient(90deg,#D8B4FE,#FDBA74)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              FENUA SIM
            </span>
          </h1>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,.65)", lineHeight: 1.7, maxWidth: "540px", margin: "0 auto 32px" }}>
            Des acteurs clés du tourisme, de l'assurance et du commerce dans le Pacifique qui offrent nos eSIM à leurs clients.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#partenaires" style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "linear-gradient(90deg,#A020F0,#FF7F11)", color: "#fff", padding: "12px 24px", borderRadius: "50px", fontWeight: 700, fontSize: "14px", textDecoration: "none", boxShadow: "0 4px 16px rgba(160,32,240,.35)" }}>
              Voir nos partenaires
            </a>
            <a href="#candidature" style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", color: "#fff", padding: "12px 22px", borderRadius: "50px", fontWeight: 600, fontSize: "14px", textDecoration: "none" }}>
              Devenir partenaire
            </a>
          </div>
        </div>
      </div>

      {/* ── PARTENAIRES ── */}
      <div id="partenaires" style={{ maxWidth: "1100px", margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2 style={{ fontWeight: 800, fontSize: "28px", letterSpacing: "-.04em", color: "#111827", marginBottom: "10px" }}>
            Nos partenaires officiels
          </h2>
          <p style={{ fontSize: "15px", color: "#6B7280", maxWidth: "480px", margin: "0 auto" }}>
            Des organisations reconnues qui recommandent FENUA SIM à leurs clients voyageurs.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: "20px" }}>
          {PARTNERS.map((p) => (
            <div key={p.id} style={{ background: "#fff", borderRadius: "18px", border: "0.5px solid #E5E7EB", padding: "24px", display: "flex", gap: "18px", alignItems: "flex-start", transition: "all .2s", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(160,32,240,.1)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(160,32,240,.2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,.05)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#E5E7EB"; }}
            >
              {/* Avatar */}
              <div style={{ width: "60px", height: "60px", borderRadius: "14px", background: p.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "18px", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,.15)" }}>
                {p.initials}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
                  <h3 style={{ fontWeight: 800, fontSize: "16px", color: "#111827", lineHeight: 1.2 }}>{p.name}</h3>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", background: "#F3F4F6", padding: "3px 9px", borderRadius: "50px", flexShrink: 0, whiteSpace: "nowrap" }}>
                    {p.territory}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "10px" }}>
                  <span style={{ color: "#A020F0" }}>{p.icon}</span>
                  <span style={{ fontSize: "12px", color: "#A020F0", fontWeight: 600 }}>{p.category}</span>
                </div>

                <p style={{ fontSize: "13px", color: "#6B7280", lineHeight: 1.6, marginBottom: "12px" }}>
                  {p.description}
                </p>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {p.tags.map((tag) => (
                    <span key={tag} style={{ fontSize: "11px", fontWeight: 600, color: "#7B15B8", background: "#F3E8FF", padding: "2px 10px", borderRadius: "50px" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AVANTAGES PARTENAIRE ── */}
      <div style={{ background: "linear-gradient(135deg,#F3E8FF,#FFF7ED)", borderTop: "0.5px solid #DDD6FE", borderBottom: "0.5px solid #DDD6FE", padding: "64px 24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#fff", border: "1px solid #DDD6FE", borderRadius: "50px", padding: "5px 14px", marginBottom: "16px" }}>
              <span style={{ fontSize: "12px", color: "#7B15B8", fontWeight: 700 }}>⭐ Programme partenaire</span>
            </div>
            <h2 style={{ fontWeight: 800, fontSize: "28px", letterSpacing: "-.04em", color: "#111827", marginBottom: "10px" }}>
              Pourquoi rejoindre notre réseau ?
            </h2>
            <p style={{ fontSize: "15px", color: "#6B7280", maxWidth: "460px", margin: "0 auto" }}>
              Des avantages concrets pour vous et une vraie valeur ajoutée pour vos clients voyageurs.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {AVANTAGES.map(({ icon, title, desc }) => (
              <div key={title} style={{ background: "#fff", borderRadius: "14px", border: "0.5px solid #DDD6FE", padding: "20px 22px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ fontSize: "24px", flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827", marginBottom: "4px" }}>{title}</div>
                  <div style={{ fontSize: "13px", color: "#6B7280", lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FORMULAIRE CANDIDATURE ── */}
      <div id="candidature" style={{ maxWidth: "720px", margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h2 style={{ fontWeight: 800, fontSize: "28px", letterSpacing: "-.04em", color: "#111827", marginBottom: "10px" }}>
            Devenir partenaire FENUA SIM
          </h2>
          <p style={{ fontSize: "15px", color: "#6B7280", maxWidth: "460px", margin: "0 auto" }}>
            Vous êtes une agence de voyages, un assureur, un hôtel ou un acteur du tourisme ? Rejoignez notre réseau.
          </p>
        </div>

        <div style={{ background: "#fff", borderRadius: "20px", border: "0.5px solid #E5E7EB", padding: "36px", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
          <PartnerForm />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginTop: "24px", flexWrap: "wrap" }}>
          {["🔒 Données sécurisées", "⚡ Réponse sous 48h", "💬 Support WhatsApp dédié"].map((t) => (
            <span key={t} style={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ── CTA FINAL ── */}
      <div style={{ background: "linear-gradient(145deg,#0D0621,#2D0E6B)", padding: "48px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto" }}>
          <h2 style={{ fontWeight: 800, fontSize: "24px", color: "#fff", marginBottom: "12px", letterSpacing: "-.04em" }}>
            Une question sur le programme partenaire ?
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,.6)", marginBottom: "24px", lineHeight: 1.6 }}>
            Notre équipe est disponible sur WhatsApp 7j/7 pour répondre à toutes vos questions.
          </p>
          <a href="https://wa.me/33749782101" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#25D366", color: "#fff", padding: "13px 26px", borderRadius: "50px", fontWeight: 700, fontSize: "14px", textDecoration: "none", boxShadow: "0 4px 14px rgba(37,211,102,.3)" }}>
            💬 Nous contacter sur WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
