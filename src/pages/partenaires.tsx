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

// ─────────────────────────────────────────────────────────
// PARTENAIRES
// ─────────────────────────────────────────────────────────
const PARTNERS = [
  {
    id: "matarii",
    initials: "MV",
    logo: "/logos/logo matarii.webp",
    logoBackground: "#111827",
    color: "linear-gradient(135deg, #0EA5E9, #0369A1)",
    name: "MATARI’I VOYAGES",
    category: "Agence de voyages",
    territory: "Polynésie française",
    icon: <Plane size={17} />,
    description:
      "Matari’i Voyages accompagne les voyageurs dans l’organisation de leurs séjours en Polynésie française.",
    tags: ["Voyage", "Polynésie"],
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
      "ANSET Assurances Tahiti accompagne ses clients dans leurs besoins d’assurance.",
    tags: ["Assurance", "Tahiti"],
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
      "ANSET NC accompagne particuliers et professionnels dans leurs solutions d’assurance.",
    tags: ["Assurance", "NC"],
    website: "https://www.anset.nc",
  },
  {
    id: "vanz",
    initials: "VZ",
    logo: "/logos/logo-vanz.png",
    logoBackground: "#111827",
    color: "linear-gradient(135deg, #10B981, #059669)",
    name: "VANZ TRAVEL",
    category: "Road trip",
    territory: "Australie / NZ",
    icon: <Building2 size={17} />,
    description:
      "Vanz Travel organise des road trips en van en Australie et Nouvelle-Zélande.",
    tags: ["Van", "Road trip"],
    website: "https://www.vanztravel.com/fr/",
  },
  {
    id: "go-frenchies",
    initials: "GF",
    logo: "/logos/logo-gofrenchies.jpg",
    logoBackground: "#fff",
    color: "linear-gradient(135deg, #2563EB, #1E40AF)",
    name: "GO FRENCHIES",
    category: "Accompagnement",
    territory: "Monde", // ✅ corrigé
    icon: <Plane size={17} />,
    description:
      "Go Frenchies accompagne les francophones dans leur projet de voyage ou d’expatriation.",
    tags: ["Australie", "Francophones"],
    website: "https://gofrenchies.fr",
  },
];

// ─────────────────────────────────────────────────────────
// FORMULAIRE
// ─────────────────────────────────────────────────────────
function PartnerForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div style={{ textAlign: "center" }}>
        <h3>Merci !</h3>
        <p>Nous vous recontactons rapidement.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      <input placeholder="Société" required style={input} />
      <input placeholder="Email" required style={input} />
      <button style={btn}>Envoyer</button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────
export default function PartenairesPage() {
  return (
    <main style={{ background: "#F8FAFC" }}>
      
      {/* HERO CLEAN */}
      <section style={hero}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={badge}>
            <Handshake size={14} /> Réseau partenaires
          </div>

          <h1 style={title}>
            Développons ensemble <br />
            la connectivité des voyageurs
          </h1>

          <p style={subtitle}>
            Rejoignez FENUA SIM et proposez une solution eSIM simple à vos clients.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <a href="#partenaires" style={primaryBtn}>Voir les partenaires</a>
            <a href="#candidature" style={secondaryBtn}>Devenir partenaire</a>
          </div>
        </div>
      </section>

      {/* PARTENAIRES */}
      <section id="partenaires" style={{ padding: 60 }}>
        <h2 style={{ textAlign: "center" }}>Nos partenaires</h2>

        <div style={grid}>
          {PARTNERS.map((p) => (
            <div key={p.id} style={card}>
              <img src={p.logo} style={{ height: 50, objectFit: "contain" }} />

              <h3>{p.name}</h3>
              <p>{p.description}</p>

              <a href={p.website} target="_blank" style={btn}>
                Voir le site <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* FORM */}
      <section id="candidature" style={{ padding: 60 }}>
        <h2 style={{ textAlign: "center" }}>Devenir partenaire</h2>
        <PartnerForm />
      </section>
    </main>
  );
}

// ─────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────
const hero = {
  padding: "100px 20px",
  background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)",
  color: "#fff",
};

const title = {
  fontSize: 48,
  fontWeight: 900,
};

const subtitle = {
  opacity: 0.8,
  marginBottom: 20,
};

const badge = {
  background: "rgba(255,255,255,.1)",
  padding: "6px 12px",
  borderRadius: 999,
  display: "inline-flex",
  gap: 6,
  marginBottom: 20,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
  gap: 20,
};

const card = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const btn = {
  marginTop: "auto",
  background: "#111",
  color: "#fff",
  padding: 10,
  borderRadius: 10,
  display: "flex",
  justifyContent: "center",
  gap: 6,
};

const primaryBtn = {
  background: "linear-gradient(90deg,#A020F0,#FF7F11)",
  padding: "12px 20px",
  borderRadius: 999,
  color: "#fff",
};

const secondaryBtn = {
  border: "1px solid #fff",
  padding: "12px 20px",
  borderRadius: 999,
  color: "#fff",
};

const input = {
  display: "block",
  width: "100%",
  marginBottom: 10,
  padding: 10,
};
