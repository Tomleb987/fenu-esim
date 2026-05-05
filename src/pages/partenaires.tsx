"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  Shield,
  Plane,
  Building2,
  Handshake,
  Sparkles,
} from "lucide-react";

const PARTNERS = [
  {
    id: "matarii",
    initials: "MV",
    logo: "/logos/logo%20matarii.webp",
    logoBackground: "#111827",
    color: "linear-gradient(135deg, #0EA5E9, #0369A1)",
    name: "MATARI’I VOYAGES",
    category: "Agence de voyages",
    territory: "Polynésie française",
    icon: <Plane size={17} />,
    description:
      "Matari’i Voyages accompagne les voyageurs dans l’organisation de leurs séjours et déplacements en Polynésie française. FENUA SIM complète cette expérience avec une solution eSIM simple et pratique.",
    tags: ["Voyage", "Polynésie", "Séjours"],
    website: "https://www.matarii-voyages.com/",
  },
  {
    id: "anset-pf",
    initials: "AA",
    logo: "/logos/logo-ansetpf.svg",
    logoBackground: "#fff",
    color: "linear-gradient(135deg, #A020F0, #7B15B8)",
    name: "ANSET ASSURANCES TAHITI",
    category: "Assurance",
    territory: "Polynésie française",
    icon: <Shield size={17} />,
    description:
      "ANSET Assurances Tahiti accompagne ses clients dans leurs besoins d’assurance en Polynésie française. FENUA SIM apporte une solution utile pour les déplacements à l’international.",
    tags: ["Assurance", "Tahiti", "Voyage"],
    website: "https://www.anset.pf",
  },
  {
    id: "anset-nc",
    initials: "AN",
    logo: "/logos/logo-ansetnc.svg",
    logoBackground: "#fff",
    color: "linear-gradient(135deg, #FF7F11, #CC6500)",
    name: "ANSET ASSURANCES NOUVELLE-CALÉDONIE",
    category: "Assurance",
    territory: "Nouvelle-Calédonie",
    icon: <Shield size={17} />,
    description:
      "ANSET Assurances Nouvelle-Calédonie accompagne particuliers et professionnels dans leurs solutions d’assurance. FENUA SIM facilite la connectivité lors des voyages.",
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
    icon: <Building2 size={17} />,
    description:
      "Vanz Travel accompagne les voyageurs dans l’organisation de road trips en van, camping-car ou véhicule aménagé en Australie et en Nouvelle-Zélande.",
    tags: ["Road trip", "Van", "Australie", "NZ"],
    website: "https://www.vanztravel.com/fr/",
  },
  {
    id: "go-frenchies",
    initials: "GF",
    logo: "/logos/logo-gofrenchies.jpg",
    logoBackground: "#fff",
    color: "linear-gradient(135deg, #2563EB, #1E40AF)",
    name: "GO FRENCHIES",
    category: "Voyage & accompagnement",
    territory: "Australie",
    icon: <Plane size={17} />,
    description:
      "Go Frenchies accompagne les francophones dans leur projet de départ, d’installation ou de voyage en Australie. FENUA SIM permet de rester connecté dès l’arrivée.",
    tags: ["Australie", "Francophones", "Voyage"],
    website: "https://gofrenchies.fr",
  },
];

const AVANTAGES = [
  {
    icon: "💰",
    title: "Commission attractive",
    desc: "Percevez une commission sur chaque eSIM vendue via votre lien ou code partenaire.",
  },
  {
    icon: "📊",
    title: "Suivi des performances",
    desc: "Suivez vos ventes, vos recommandations et vos résultats simplement.",
  },
  {
    icon: "🎯",
    title: "Supports marketing",
    desc: "Recevez des supports prêts à l’emploi pour présenter FENUA SIM à vos clients.",
  },
  {
    icon: "🤝",
    title: "Accompagnement dédié",
    desc: "Notre équipe vous accompagne pour lancer et optimiser le partenariat.",
  },
  {
    icon: "🔗",
    title: "Lien personnalisé",
    desc: "Un lien unique pour suivre précisément les clients que vous recommandez.",
  },
  {
    icon: "⚡",
    title: "Mise en place simple",
    desc: "Aucune intégration complexe : un lien, un QR code ou un code partenaire suffit.",
  },
];

function PartnerLogo({
  partner,
  compact = false,
}: {
  partner: (typeof PARTNERS)[number];
  compact?: boolean;
}) {
  return (
    <div
      style={{
        width: compact ? 48 : 74,
        height: compact ? 48 : 74,
        borderRadius: compact ? 16 : 22,
        background: partner.logo ? partner.logoBackground : partner.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 950,
        fontSize: compact ? 15 : 19,
        border: "1px solid #E5E7EB",
        overflow: "hidden",
        padding: compact ? 7 : 10,
        flexShrink: 0,
      }}
    >
      {partner.logo ? (
        <img
          src={partner.logo}
          alt={`Logo ${partner.name}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            backgroundColor: partner.logoBackground,
          }}
        />
      ) : (
        partner.initials
      )}
    </div>
  );
}

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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #E5E7EB",
    borderRadius: "14px",
    padding: "13px 15px",
    fontSize: "14px",
    color: "#111827",
    outline: "none",
    background: "#fff",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 800,
    color: "#374151",
    marginBottom: "7px",
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.societe ||
      !form.nom ||
      !form.prenom ||
      !form.email ||
      !form.activite ||
      !form.territoire
    ) {
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

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "44px 20px" }}>
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: "22px",
            background: "linear-gradient(135deg,#A020F0,#FF7F11)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 30,
          }}
        >
          ✓
        </div>

        <h3
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: "#111827",
            marginBottom: 10,
          }}
        >
          Candidature reçue
        </h3>

        <p
          style={{
            color: "#6B7280",
            fontSize: 15,
            lineHeight: 1.6,
            maxWidth: 420,
            margin: "0 auto 24px",
          }}
        >
          Merci pour votre intérêt. Notre équipe vous contactera rapidement pour
          discuter du partenariat.
        </p>

        <Link
          href="/shop"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "linear-gradient(90deg,#A020F0,#FF7F11)",
            color: "#fff",
            padding: "13px 24px",
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 14,
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
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
          gap: 16,
        }}
      >
        <div>
          <label style={labelStyle}>Société / Structure *</label>
          <input
            name="societe"
            value={form.societe}
            onChange={handleChange}
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
            <option value="mobilite">Mobilité / Road trip</option>
            <option value="accompagnement">Accompagnement voyageurs</option>
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
            <option value="australie">Australie</option>
            <option value="nz">Nouvelle-Zélande</option>
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
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 16,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#DC2626",
            borderRadius: 14,
            padding: "12px 14px",
            fontSize: 13,
            fontWeight: 700,
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
          marginTop: 18,
          background: "linear-gradient(90deg,#A020F0,#FF7F11)",
          color: "#fff",
          border: "none",
          borderRadius: 16,
          padding: "15px",
          fontWeight: 900,
          fontSize: 15,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.8 : 1,
          boxShadow: "0 14px 30px rgba(160,32,240,.22)",
        }}
      >
        {loading ? "Envoi en cours…" : "Soumettre ma candidature →"}
      </button>

      <p
        style={{
          textAlign: "center",
          marginTop: 12,
          fontSize: 11,
          color: "#9CA3AF",
        }}
      >
        Vos données sont utilisées uniquement pour traiter votre demande de
        partenariat.
      </p>
    </form>
  );
}

export default function PartenairesPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 20% 20%, rgba(160,32,240,.28), transparent 32%), radial-gradient(circle at 80% 10%, rgba(255,127,17,.24), transparent 30%), linear-gradient(145deg,#070312,#160A35 55%,#2D0E6B)",
          padding: "82px 24px 74px",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
            gap: 40,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,.09)",
                border: "1px solid rgba(255,255,255,.16)",
                color: "#fff",
                borderRadius: 999,
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 22,
              }}
            >
              <Handshake size={15} /> Réseau partenaires FENUA SIM
            </div>

            <h1
              style={{
                color: "#fff",
                fontSize: "clamp(34px,5vw,58px)",
                lineHeight: 1.03,
                letterSpacing: "-.06em",
                fontWeight: 950,
                marginBottom: 18,
              }}
            >
              Des partenaires qui accompagnent les voyageurs connectés.
            </h1>

            <p
              style={{
                color: "rgba(255,255,255,.68)",
                fontSize: 17,
                lineHeight: 1.75,
                maxWidth: 590,
                marginBottom: 30,
              }}
            >
              Agences de voyages, assurances, mobilité et accompagnement à
              l’étranger : FENUA SIM s’associe à des acteurs de confiance pour
              simplifier la connectivité des voyageurs.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="#partenaires" style={primaryButton}>
                Voir les partenaires
              </a>
              <a href="#candidature" style={secondaryButton}>
                Devenir partenaire
              </a>
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.13)",
              borderRadius: 28,
              padding: 24,
              boxShadow: "0 30px 80px rgba(0,0,0,.25)",
              backdropFilter: "blur(18px)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {PARTNERS.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: "rgba(255,255,255,.94)",
                    borderRadius: 20,
                    padding: 16,
                    minHeight: 128,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <PartnerLogo partner={p} compact />
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: "#111827",
                      marginTop: 12,
                    }}
                  >
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>
                    {p.territory}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="partenaires"
        style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 24px" }}
      >
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={eyebrow}>
            <Sparkles size={14} /> Partenaires officiels
          </div>

          <h2
            style={{
              fontSize: "clamp(28px,4vw,42px)",
              fontWeight: 950,
              color: "#111827",
              letterSpacing: "-.05em",
              marginBottom: 12,
            }}
          >
            Ils recommandent FENUA SIM
          </h2>

          <p
            style={{
              color: "#6B7280",
              maxWidth: 560,
              margin: "0 auto",
              lineHeight: 1.7,
              fontSize: 15,
            }}
          >
            Des partenaires sélectionnés pour leur proximité avec les voyageurs
            et leur expertise dans leur domaine.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
            gap: 22,
            alignItems: "stretch",
          }}
        >
          {PARTNERS.map((p) => (
            <article
              key={p.id}
              style={{
                height: "100%",
                background: "#fff",
                borderRadius: 26,
                border: "1px solid #E5E7EB",
                padding: 24,
                boxShadow: "0 14px 40px rgba(15,23,42,.06)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 5,
                  background: p.color,
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 18,
                }}
              >
                <PartnerLogo partner={p} />

                <span
                  style={{
                    alignSelf: "flex-start",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#6B7280",
                    background: "#F3F4F6",
                    padding: "6px 10px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.territory}
                </span>
              </div>

              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 950,
                  color: "#111827",
                  letterSpacing: "-.03em",
                  marginBottom: 8,
                }}
              >
                {p.name}
              </h3>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  color: "#A020F0",
                  fontSize: 13,
                  fontWeight: 800,
                  marginBottom: 14,
                }}
              >
                {p.icon}
                {p.category}
              </div>

              <p
                style={{
                  fontSize: 14,
                  color: "#6B7280",
                  lineHeight: 1.7,
                  marginBottom: 18,
                }}
              >
                {p.description}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 7,
                  flexWrap: "wrap",
                  marginBottom: 20,
                }}
              >
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#7B15B8",
                      background: "#F3E8FF",
                      padding: "5px 10px",
                      borderRadius: 999,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <a
                href={p.website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visiter le site de ${p.name}`}
                style={{
                  marginTop: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                  borderRadius: 15,
                  padding: "13px 16px",
                  background: "#111827",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 900,
                  textDecoration: "none",
                }}
              >
                Visiter le site partenaire <ExternalLink size={15} />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section
        style={{
          background: "linear-gradient(135deg,#F3E8FF,#FFF7ED)",
          borderTop: "1px solid #DDD6FE",
          borderBottom: "1px solid #DDD6FE",
          padding: "72px 24px",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 42 }}>
            <div style={eyebrow}>⭐ Programme partenaire</div>
            <h2
              style={{
                fontSize: "clamp(28px,4vw,40px)",
                fontWeight: 950,
                color: "#111827",
                letterSpacing: "-.05em",
                marginBottom: 12,
              }}
            >
              Pourquoi rejoindre notre réseau ?
            </h2>
            <p
              style={{
                color: "#6B7280",
                maxWidth: 520,
                margin: "0 auto",
                lineHeight: 1.7,
              }}
            >
              Un partenariat simple à mettre en place, utile pour vos clients et
              créateur de revenus additionnels.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
              gap: 18,
            }}
          >
            {AVANTAGES.map((item) => (
              <div
                key={item.title}
                style={{
                  background: "rgba(255,255,255,.88)",
                  border: "1px solid #E9D5FF",
                  borderRadius: 22,
                  padding: 22,
                  display: "flex",
                  gap: 15,
                  boxShadow: "0 12px 30px rgba(126,34,206,.06)",
                }}
              >
                <div style={{ fontSize: 26 }}>{item.icon}</div>
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 900,
                      color: "#111827",
                      marginBottom: 6,
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#6B7280",
                      lineHeight: 1.6,
                    }}
                  >
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="candidature"
        style={{ maxWidth: 780, margin: "0 auto", padding: "72px 24px" }}
      >
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <div style={eyebrow}>🚀 Candidature</div>
          <h2
            style={{
              fontSize: "clamp(28px,4vw,40px)",
              fontWeight: 950,
              color: "#111827",
              letterSpacing: "-.05em",
              marginBottom: 12,
            }}
          >
            Devenir partenaire FENUA SIM
          </h2>
          <p
            style={{
              color: "#6B7280",
              maxWidth: 520,
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Vous accompagnez des voyageurs ? Présentez-nous votre activité et
            construisons un partenariat utile.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 28,
            padding: "clamp(24px,4vw,40px)",
            boxShadow: "0 20px 60px rgba(15,23,42,.08)",
          }}
        >
          <PartnerForm />
        </div>
      </section>

      <section
        style={{
          background: "linear-gradient(145deg,#070312,#2D0E6B)",
          padding: "58px 24px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            color: "#fff",
            fontSize: 28,
            fontWeight: 950,
            letterSpacing: "-.04em",
            marginBottom: 12,
          }}
        >
          Une question sur le programme partenaire ?
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,.65)",
            fontSize: 15,
            marginBottom: 26,
          }}
        >
          Notre équipe est disponible pour échanger avec vous.
        </p>
        <a
          href="https://wa.me/33749782101"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#25D366",
            color: "#fff",
            padding: "14px 26px",
            borderRadius: 999,
            fontWeight: 900,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          💬 Nous contacter sur WhatsApp
        </a>
      </section>
    </main>
  );
}

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(90deg,#A020F0,#FF7F11)",
  color: "#fff",
  padding: "14px 24px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 14,
  textDecoration: "none",
  boxShadow: "0 18px 35px rgba(160,32,240,.28)",
};

const secondaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255,255,255,.1)",
  border: "1px solid rgba(255,255,255,.2)",
  color: "#fff",
  padding: "14px 22px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 14,
  textDecoration: "none",
};

const eyebrow: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  background: "#fff",
  border: "1px solid #E9D5FF",
  color: "#7B15B8",
  borderRadius: 999,
  padding: "7px 14px",
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 16,
};
