"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  Shield,
  Plane,
  Building2,
} from "lucide-react";

const PARTNERS = [
  {
    id: "matarii",
    initials: "MV",
    logo: "/logos/logo-matarii.webp",
    logoBackground: "#111827",
    color: "linear-gradient(135deg, #0EA5E9, #0369A1)",
    name: "MATARI’I VOYAGES",
    category: "Agence de voyages",
    territory: "Polynésie française",
    icon: <Plane size={18} />,
    description:
      "Basée en Polynésie française, Matari’i Voyages accompagne les voyageurs dans l’organisation de leurs séjours et déplacements. FENUA SIM complète cette expérience avec une solution eSIM simple et pratique pour rester connecté pendant le voyage.",
    tags: ["Agence de voyages", "Polynésie", "Séjours"],
    website: "https://www.matarii-voyages.com/",
  },
  {
    id: "anset-pf",
    initials: "AA",
    logo: null,
    logoBackground: "#fff",
    color: "linear-gradient(135deg, #A020F0, #7B15B8)",
    name: "ANSET ASSURANCES TAHITI",
    category: "Assurance",
    territory: "Polynésie française",
    icon: <Shield size={18} />,
    description:
      "ANSET Assurances Tahiti accompagne ses clients dans leurs besoins d’assurance en Polynésie française. FENUA SIM apporte une solution complémentaire utile pour les déplacements et voyages à l’international.",
    tags: ["Assurance", "Tahiti", "Voyage"],
    website: "https://www.anset.pf",
  },
  {
    id: "anset-nc",
    initials: "AN",
    logo: null,
    logoBackground: "#fff",
    color: "linear-gradient(135deg, #FF7F11, #CC6500)",
    name: "ANSET ASSURANCES NOUVELLE-CALÉDONIE",
    category: "Assurance",
    territory: "Nouvelle-Calédonie",
    icon: <Shield size={18} />,
    description:
      "ANSET Assurances Nouvelle-Calédonie accompagne particuliers et professionnels dans leurs solutions d’assurance. Grâce à FENUA SIM, les voyageurs peuvent bénéficier d’une connectivité simple lors de leurs déplacements.",
    tags: ["Assurance", "Nouvelle-Calédonie", "Mobilité"],
    website: "https://www.anset.nc",
  },
  {
    id: "vanz",
    initials: "VZ",
    logo: "/logos/logo-vanz.png",
    logoBackground: "#111827",
    color: "linear-gradient(135deg, #10B981, #059669)",
    name: "VANZ TRAVEL",
    category: "Road trip & voyage",
    territory: "Australie / Nouvelle-Zélande",
    icon: <Building2 size={18} />,
    description:
      "Vanz Travel accompagne les voyageurs dans l’organisation de road trips en van, camping-car ou véhicule aménagé en Australie et en Nouvelle-Zélande. FENUA SIM permet de rester connecté simplement pendant l’aventure.",
    tags: ["Road trip", "Van", "Australie", "Nouvelle-Zélande"],
    website: "https://www.vanztravel.com/fr/",
  },
];

const AVANTAGES = [
  {
    icon: "💰",
    title: "Commission attractive",
    desc: "Percevez une commission sur chaque eSIM vendue via votre code partenaire.",
  },
  {
    icon: "📊",
    title: "Dashboard dédié",
    desc: "Suivez vos ventes, commissions et performances en temps réel.",
  },
  {
    icon: "🎯",
    title: "Supports marketing",
    desc: "Accédez à des supports prêts à l’emploi pour promouvoir FENUA SIM.",
  },
  {
    icon: "🤝",
    title: "Support prioritaire",
    desc: "Une ligne dédiée WhatsApp pour vous et vos clients.",
  },
  {
    icon: "🔗",
    title: "Lien personnalisé",
    desc: "Un lien unique pour suivre précisément vos recommandations.",
  },
  {
    icon: "⚡",
    title: "Intégration simple",
    desc: "Aucune intégration technique requise : un lien ou un code suffit.",
  },
];

function PartnerForm() {
  const [form, setForm] = useState({
    societe: "",
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    territoire: "",
    activite: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.societe || !form.email || !form.nom || !form.prenom) {
      setError("Merci de remplir tous les champs obligatoires.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/partner-candidature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Erreur serveur");

      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1.5px solid #E5E7EB",
    borderRadius: "10px",
    padding: "11px 14px",
    fontSize: "14px",
    fontFamily: "inherit",
    color: "#111827",
    outline: "none",
    background: "#fff",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 700,
    color: "#374151",
    marginBottom: "6px",
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "linear-gradient(135deg,#A020F0,#FF7F11)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: "28px",
          }}
        >
          ✅
        </div>

        <h3
          style={{
            fontWeight: 800,
            fontSize: "22px",
            color: "#111827",
            marginBottom: "10px",
          }}
        >
          Candidature reçue !
        </h3>

        <p
          style={{
            fontSize: "15px",
            color: "#6B7280",
            maxWidth: "400px",
            margin: "0 auto 24px",
            lineHeight: 1.6,
          }}
        >
          Merci pour votre intérêt. Notre équipe vous contactera rapidement pour
          discuter de votre partenariat.
        </p>

        <Link
          href="/shop"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "linear-gradient(90deg,#A020F0,#FF7F11)",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: "50px",
            fontWeight: 700,
            fontSize: "14px",
            textDecoration: "none",
          }}
        >
          Découvrir nos eSIM <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "14px",
          marginBottom: "14px",
        }}
      >
        <div>
          <label style={labelStyle}>Société / Structure *</label>
          <input
            name="societe"
            value={form.societe}
            onChange={handleChange}
            placeholder="Nom de votre entreprise"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Secteur d’activité *</label>
          <select
            name="activite"
            value={form.activite}
            onChange={handleChange}
            style={inputStyle}
            required
          >
            <option value="">Sélectionner…</option>
            <option value="agence_voyage">Agence de voyages</option>
            <option value="assurance">Assurance / Courtage</option>
            <option value="hotel">Hôtellerie / Hébergement</option>
            <option value="transport">Transport</option>
            <option value="distribution">Distribution / Commerce</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Prénom *</label>
          <input
            name="prenom"
            value={form.prenom}
            onChange={handleChange}
            placeholder="Votre prénom"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Nom *</label>
          <input
            name="nom"
            value={form.nom}
            onChange={handleChange}
            placeholder="Votre nom"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Email *</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="contact@societe.com"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Téléphone</label>
          <input
            name="telephone"
            value={form.telephone}
            onChange={handleChange}
            placeholder="+689 87 00 00 00"
            style={inputStyle}
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Territoire d’activité *</label>
          <select
            name="territoire"
            value={form.territoire}
            onChange={handleChange}
            style={inputStyle}
            required
          >
            <option value="">Sélectionner…</option>
            <option value="pf">Polynésie française</option>
            <option value="nc">Nouvelle-Calédonie</option>
            <option value="france">France métropolitaine</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Message</label>
          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            placeholder="Décrivez votre projet de partenariat…"
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "10px",
            padding: "10px 14px",
            fontSize: "13px",
            color: "#EF4444",
            marginBottom: "14px",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          background: "linear-gradient(90deg,#A020F0,#FF7F11)",
          color: "#fff",
          border: "none",
          borderRadius: "12px",
          padding: "14px",
          fontWeight: 800,
          fontSize: "15px",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.8 : 1,
        }}
      >
        {loading ? "Envoi en cours…" : "Soumettre ma candidature →"}
      </button>
    </form>
  );
}

export default function PartenairesPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      <section
        style={{
          background:
            "linear-gradient(145deg,#0D0621 0%,#1A0A3D 45%,#2D0E6B 75%)",
          padding: "64px 24px 56px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.15)",
              borderRadius: "50px",
              padding: "6px 14px",
              marginBottom: "20px",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            🤝 Réseau de partenaires
          </div>

          <h1
            style={{
              fontWeight: 900,
              fontSize: "clamp(30px,5vw,48px)",
              color: "#fff",
              letterSpacing: "-.05em",
              lineHeight: 1.1,
              marginBottom: "16px",
            }}
          >
            Ils font confiance à{" "}
            <span
              style={{
                background: "linear-gradient(90deg,#D8B4FE,#FDBA74)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              FENUA SIM
            </span>
          </h1>

          <p
            style={{
              fontSize: "16px",
              color: "rgba(255,255,255,.68)",
              lineHeight: 1.7,
              maxWidth: "560px",
              margin: "0 auto 32px",
            }}
          >
            Des partenaires du voyage, de l’assurance et de la mobilité qui
            recommandent nos solutions eSIM à leurs clients.
          </p>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <a
              href="#partenaires"
              style={{
                background: "linear-gradient(90deg,#A020F0,#FF7F11)",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: "50px",
                fontWeight: 700,
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              Voir nos partenaires
            </a>

            <a
              href="#candidature"
              style={{
                background: "rgba(255,255,255,.1)",
                border: "1px solid rgba(255,255,255,.2)",
                color: "#fff",
                padding: "12px 22px",
                borderRadius: "50px",
                fontWeight: 600,
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              Devenir partenaire
            </a>
          </div>
        </div>
      </section>

      <section
        id="partenaires"
        style={{ maxWidth: "1100px", margin: "0 auto", padding: "64px 24px" }}
      >
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2
            style={{
              fontWeight: 800,
              fontSize: "28px",
              color: "#111827",
              marginBottom: "10px",
            }}
          >
            Nos partenaires officiels
          </h2>

          <p
            style={{
              fontSize: "15px",
              color: "#6B7280",
              maxWidth: "500px",
              margin: "0 auto",
            }}
          >
            Des organisations qui accompagnent les voyageurs et renforcent
            l’expérience FENUA SIM.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 480px), 1fr))",
            gap: "20px",
          }}
        >
          {PARTNERS.map((p) => (
            <article
              key={p.id}
              style={{
                background: "#fff",
                borderRadius: "18px",
                border: "1px solid #E5E7EB",
                padding: "24px",
                display: "flex",
                gap: "18px",
                alignItems: "flex-start",
                boxShadow: "0 1px 3px rgba(0,0,0,.05)",
              }}
            >
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "16px",
                  background: p.logo ? p.logoBackground : p.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "18px",
                  flexShrink: 0,
                  border: "1px solid #E5E7EB",
                  overflow: "hidden",
                  padding: "8px",
                }}
              >
                {p.logo ? (
                  <Image
                    src={p.logo}
                    alt={`Logo ${p.name}`}
                    width={56}
                    height={56}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  p.initials
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "8px",
                    marginBottom: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  <h3
                    style={{
                      fontWeight: 800,
                      fontSize: "16px",
                      color: "#111827",
                      lineHeight: 1.2,
                    }}
                  >
                    {p.name}
                  </h3>

                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#6B7280",
                      background: "#F3F4F6",
                      padding: "3px 9px",
                      borderRadius: "50px",
                    }}
                  >
                    {p.territory}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    marginBottom: "10px",
                    color: "#A020F0",
                  }}
                >
                  {p.icon}
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>
                    {p.category}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "13px",
                    color: "#6B7280",
                    lineHeight: 1.6,
                    marginBottom: "12px",
                  }}
                >
                  {p.description}
                </p>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#7B15B8",
                        background: "#F3E8FF",
                        padding: "2px 10px",
                        borderRadius: "50px",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {p.website && (
                  <a
                    href={p.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visiter le site de ${p.name}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      marginTop: "14px",
                      color: "#A020F0",
                      fontSize: "13px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    Visiter le site partenaire <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        style={{
          background: "linear-gradient(135deg,#F3E8FF,#FFF7ED)",
          borderTop: "1px solid #DDD6FE",
          borderBottom: "1px solid #DDD6FE",
          padding: "64px 24px",
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2
              style={{
                fontWeight: 800,
                fontSize: "28px",
                color: "#111827",
                marginBottom: "10px",
              }}
            >
              Pourquoi rejoindre notre réseau ?
            </h2>

            <p
              style={{
                fontSize: "15px",
                color: "#6B7280",
                maxWidth: "460px",
                margin: "0 auto",
              }}
            >
              Des avantages concrets pour vous et une vraie valeur ajoutée pour
              vos clients voyageurs.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
              gap: "16px",
            }}
          >
            {AVANTAGES.map(({ icon, title, desc }) => (
              <div
                key={title}
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  border: "1px solid #DDD6FE",
                  padding: "20px 22px",
                  display: "flex",
                  gap: "14px",
                }}
              >
                <div style={{ fontSize: "24px" }}>{icon}</div>
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "14px",
                      color: "#111827",
                      marginBottom: "4px",
                    }}
                  >
                    {title}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#6B7280",
                      lineHeight: 1.5,
                    }}
                  >
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="candidature"
        style={{ maxWidth: "720px", margin: "0 auto", padding: "64px 24px" }}
      >
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h2
            style={{
              fontWeight: 800,
              fontSize: "28px",
              color: "#111827",
              marginBottom: "10px",
            }}
          >
            Devenir partenaire FENUA SIM
          </h2>

          <p
            style={{
              fontSize: "15px",
              color: "#6B7280",
              maxWidth: "460px",
              margin: "0 auto",
            }}
          >
            Vous accompagnez des voyageurs ? Rejoignez notre réseau partenaire.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            border: "1px solid #E5E7EB",
            padding: "36px",
            boxShadow: "0 4px 20px rgba(0,0,0,.05)",
          }}
        >
          <PartnerForm />
        </div>
      </section>

      <section
        style={{
          background: "linear-gradient(145deg,#0D0621,#2D0E6B)",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontWeight: 800,
            fontSize: "24px",
            color: "#fff",
            marginBottom: "12px",
          }}
        >
          Une question sur le programme partenaire ?
        </h2>

        <p
          style={{
            fontSize: "14px",
            color: "rgba(255,255,255,.65)",
            marginBottom: "24px",
          }}
        >
          Notre équipe est disponible sur WhatsApp pour répondre à vos questions.
        </p>

        <a
          href="https://wa.me/33749782101"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#25D366",
            color: "#fff",
            padding: "13px 26px",
            borderRadius: "50px",
            fontWeight: 700,
            fontSize: "14px",
            textDecoration: "none",
          }}
        >
          💬 Nous contacter sur WhatsApp
        </a>
      </section>
    </div>
  );
}
