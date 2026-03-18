// src/pages/admin/assurance.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAIL = "admin@fenuasim.com";


const G = "linear-gradient(135deg, #A020F0 0%, #FF4D6D 50%, #FF7F11 100%)";
const FRAIS = 10;
const EUR_TO_XPF = 119.33;

interface InsuranceOrder {
  id: string;
  user_email: string;
  subscriber_first_name: string;
  subscriber_last_name: string;
  product_type: string;
  adhesion_number: string;
  contract_number: string;
  premium_ava: number;
  total_amount: number;
  status: string;
  start_date: string;
  end_date: string;
  contract_link: string;
  attestation_url?: string;
  created_at: string;
}

type Step = "produit" | "voyage" | "infos" | "voyageurs" | "options" | "recap" | "lien";

const PRODUCTS = [
  { id: "ava_tourist_card", label: "Tourist Card", icon: "✈️", desc: "Multirisque complete - court sejour" },
  { id: "ava_carte_sante", label: "Carte Sante", icon: "🏥", desc: "Sante a l'etranger" },
  { id: "avantages_pom", label: "AVAntages POM", icon: "🌺", desc: "Multirisque annuelle - residents PF" },
];

const DESTINATIONS = [
  { value: "102", label: "Monde Entier (Hors USA/Canada)" },
  { value: "58", label: "USA & Canada" },
  { value: "53", label: "Europe (Schengen)" },
];

const OPTIONS_TOURIST: { id: string; subId?: string; label: string; desc: string; type: "boolean" | "select"; choices?: { id: string; label: string }[] }[] = [
  { id: "335", subId: "338", label: "Extension Garantie Annulation", desc: "Couverture des l'inscription (Tous motifs)", type: "boolean" },
  { id: "339", label: "Augmenter Plafond Annulation", desc: "Plafond par assure", type: "select", choices: [{ id: "340", label: "8.000 EUR" }, { id: "341", label: "10.000 EUR" }, { id: "342", label: "12.000 EUR" }] },
  { id: "343", label: "Augmenter Garantie Bagages", desc: "Plafond par assure", type: "select", choices: [{ id: "344", label: "2.000 EUR" }, { id: "345", label: "2.500 EUR" }, { id: "346", label: "3.000 EUR" }] },
  { id: "347", label: "Augmenter Capital Accident", desc: "Capital deces/invalidite", type: "select", choices: [{ id: "459", label: "50.000 EUR" }, { id: "457", label: "100.000 EUR" }] },
  { id: "348", subId: "349", label: "AVA SPORT+", desc: "Sports extremes & recherche 25.000 EUR", type: "boolean" },
  { id: "350", subId: "351", label: "AVA TECH+", desc: "Appareils nomades jusqu'a 3.000 EUR", type: "boolean" },
];

const OPTIONS_SANTE: { id: string; subId?: string; label: string; desc: string; type: "boolean" | "select"; choices?: { id: string; label: string }[] }[] = [
  { id: "347", label: "Augmenter Capital Accident", desc: "Capital deces/invalidite", type: "select", choices: [{ id: "459", label: "50.000 EUR" }, { id: "457", label: "100.000 EUR" }] },
  { id: "360", subId: "361", label: "AVA SNO+", desc: "Sports d'hiver, ski hors piste", type: "boolean" },
  { id: "348", subId: "349", label: "AVA SPORT+", desc: "Sports extremes", type: "boolean" },
];

const statusConfig: { [k: string]: { label: string; bg: string; color: string } } = {
  pending_payment: { label: "En attente", bg: "#FFF7ED", color: "#C2410C" },
  paid: { label: "Paye", bg: "#EDE9FE", color: "#7C3AED" },
  active: { label: "Actif", bg: "#F0FDF4", color: "#15803D" },
  cancelled: { label: "Annule", bg: "#FEF2F2", color: "#DC2626" },
};

function inp(style?: any) {
  return { width: "100%", padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, color: "#1a0533", boxSizing: "border-box" as const, ...style };
}
function lbl(text: string) {
  return <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 5 }}>{text}</label>;
}

export default function AdminAssurance() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"new" | "orders">("new");
  const [step, setStep] = useState<Step>("produit");
  const [orders, setOrders] = useState<InsuranceOrder[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [generatedInfo, setGeneratedInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState("");
  const [quote, setQuote] = useState<number | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  // Formulaire
  const [product, setProduct] = useState("ava_tourist_card");
  const [destination, setDestination] = useState("102");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [tripPrice, setTripPrice] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientNote, setClientNote] = useState("");
  const [sub, setSub] = useState({ firstName: "", lastName: "", birthDate: "", address: "", postalCode: "", city: "" });
  const [travelers, setTravelers] = useState<{ firstName: string; lastName: string; birthDate: string }[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session || session.user.email !== ADMIN_EMAIL) { router.push("/admin/login"); return; }
      setAdminUser(session.user);
      setLoading(false);
      loadOrders();
    });
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase.from("insurances").select("id, user_email, subscriber_first_name, subscriber_last_name, product_type, adhesion_number, contract_number, premium_ava, total_amount, status, start_date, end_date, contract_link, attestation_url, created_at").order("created_at", { ascending: false }).limit(100);
    if (data) setOrders(data as InsuranceOrder[]);
  };

  const exportCSV = () => {
    const paid = orders.filter(o => o.status === "active" || o.status === "paid");
    if (paid.length === 0) { alert("Aucun contrat paye a exporter."); return; }

    const rows = [
      ["Nom", "Prenom", "N° Adhesion", "Prime AVA (EUR)", "Commission 10% (EUR)", "A reverser ANSET (EUR)"],
      ...paid.map(o => {
        const primeAva = Math.max(0, (o.total_amount || 0) - FRAIS);
        const commission = +(primeAva * 0.10).toFixed(2);
        return [
          o.subscriber_last_name || "",
          o.subscriber_first_name || "",
          o.adhesion_number || "",
          primeAva.toFixed(2),
          commission.toFixed(2),
          (primeAva - commission).toFixed(2),
        ];
      })
    ];

    const csv = rows.map(r => r.map(v => "\"" + String(v).replace(/\"/g, "\"\"") + "\"").join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bordereau-assurance-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getOptions = () => product === "ava_carte_sante" ? OPTIONS_SANTE : product === "ava_tourist_card" ? OPTIONS_TOURIST : [];

  const toggleOption = (optId: string, subId?: string) => {
    const id = subId || optId;
    setSelectedOptions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectOption = (optId: string, choices: { id: string }[], value: string) => {
    const ids = choices.map(c => c.id);
    setSelectedOptions(prev => [...prev.filter(x => !ids.includes(x)), ...(value ? [value] : [])]);
  };

  const fetchQuote = async () => {
    setLoadingQuote(true);
    try {
      const response = await fetch("/api/get-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteData: {
            productType: product,
            startDate: departDate,
            endDate: returnDate,
            destinationRegion: destination,
            tripCost: Number(tripPrice) || 0,
            subscriberCountry: "PF",
            subscriber: { firstName: sub.firstName, lastName: sub.lastName, birthDate: sub.birthDate, email: clientEmail, address: sub.address, postalCode: sub.postalCode, city: sub.city },
            companions: travelers,
            options: selectedOptions,
          }
        }),
      });
      const data = await response.json();
      if (data.price) setQuote(data.price);
      else setFormError("Impossible de calculer le tarif : " + (data.error || "erreur inconnue"));
    } catch (err) {
      setFormError("Erreur calcul tarif");
    } finally {
      setLoadingQuote(false);
    }
  };

  const generateLink = async () => {
    setGenerating(true);
    setFormError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/create-insurance-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          clientEmail,
          clientNote,
          quoteData: {
            productType: product,
            startDate: departDate,
            endDate: returnDate,
            destinationRegion: destination,
            tripCost: Number(tripPrice) || 0,
            subscriberCountry: "PF",
            subscriber: { firstName: sub.firstName, lastName: sub.lastName, birthDate: sub.birthDate, email: clientEmail, address: sub.address, postalCode: sub.postalCode, city: sub.city },
            companions: travelers,
            options: selectedOptions,
            manualAmount: quote,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur serveur");
      setGeneratedLink(data.paymentUrl);
      setGeneratedInfo(data);
      setStep("lien");
      loadOrders();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setStep("produit"); setProduct("ava_tourist_card"); setDestination("102");
    setDepartDate(""); setReturnDate(""); setTripPrice(""); setClientEmail(""); setClientNote("");
    setSub({ firstName: "", lastName: "", birthDate: "", address: "", postalCode: "", city: "" });
    setTravelers([]); setSelectedOptions([]); setQuote(null); setGeneratedLink(""); setGeneratedInfo(null); setFormError("");
  };

  const copyLink = async () => { await navigator.clipboard.writeText(generatedLink); setCopied(true); setTimeout(() => setCopied(false), 2500); };

  const stepList: Step[] = ["produit", "voyage", "infos", "voyageurs", "options", "recap", "lien"];
  const stepLabels = ["Produit", "Voyage", "Infos", "Voyageurs", "Options", "Recap", "Lien"];
  const stepIdx = stepList.indexOf(step);

  const tomorrow = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f7ff" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #f3e8ff", borderTopColor: "#A020F0", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <Head>
        <title>Admin Assurance - FENUA SIM</title>
        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
          .ani{animation:fadein .2s ease}
          .nav-btn:hover{background:rgba(255,255,255,0.08)}
          input:focus,select:focus,textarea:focus{outline:none;border-color:#A020F0!important;box-shadow:0 0 0 3px rgba(160,32,240,0.1)}
          .row-hover:hover{background:#faf5ff}
        `}</style>
      </Head>

      <div style={{ minHeight: "100vh", display: "flex", fontFamily: "Arial, Helvetica, sans-serif", background: "#f8f7ff" }}>

        {/* SIDEBAR */}
        <aside style={{ width: 220, background: "#1a0533", display: "flex", flexDirection: "column", flexShrink: 0, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(160,32,240,0.3) 0%,transparent 60%)", pointerEvents: "none" }} />

          <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "relative" }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FENUA</span>
              <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 2px" }}>•</span>
              <span style={{ background: "linear-gradient(135deg,#FF4D6D,#FF7F11)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SIM</span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 2, letterSpacing: "0.8px", textTransform: "uppercase" }}>Administration</p>
          </div>

          <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 6 }}>A</div>
            <p style={{ color: "#fff", fontSize: 12, fontWeight: 600, margin: 0 }}>Admin</p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 1 }}>admin@fenuasim.com</p>
          </div>

          <nav style={{ flex: 1, padding: "10px 0", position: "relative" }}>
            {[
              { key: "new", label: "Nouvelle commande", icon: "+" },
              { key: "orders", label: "Historique", icon: "≡" },
            ].map(item => (
              <button key={item.key} onClick={() => { setActiveTab(item.key as any); if (item.key === "new") resetForm(); }}
                className="nav-btn"
                style={{ width: "100%", textAlign: "left", padding: "10px 20px", fontSize: 13, fontWeight: activeTab === item.key ? 600 : 400, color: activeTab === item.key ? "#fff" : "rgba(255,255,255,0.5)", background: activeTab === item.key ? "rgba(160,32,240,0.2)" : "transparent", border: "none", borderLeft: `3px solid ${activeTab === item.key ? "#A020F0" : "transparent"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all .15s" }}>
                <span style={{ opacity: 0.8 }}>{item.icon}</span>{item.label}
              </button>
            ))}
          </nav>

          <div style={{ padding: 14, position: "relative" }}>
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/admin/login"); }}
              style={{ width: "100%", padding: "8px", fontSize: 11, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, cursor: "pointer" }}>
              Deconnexion
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
          <header style={{ background: "#fff", padding: "0 32px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0e8ff", flexShrink: 0 }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#1a0533" }}>
              {activeTab === "new" ? "Nouvelle commande assurance" : "Historique des commandes"}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#16a34a", fontWeight: 500 }}>
              <span style={{ width: 7, height: 7, background: "#16a34a", borderRadius: "50%", display: "inline-block" }} />Connecte
            </div>
          </header>

          <div style={{ padding: 28, flex: 1 }}>

            {/* ── TAB NOUVELLE COMMANDE */}
            {activeTab === "new" && (
              <div style={{ maxWidth: 780, margin: "0 auto" }}>

                {/* Stepper */}
                {step !== "lien" && (
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
                    {stepList.filter(s => s !== "lien").map((s, i) => {
                      const done = i < stepIdx;
                      const active = i === stepIdx;
                      return (
                        <div key={s} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: done ? G : active ? G : "#e5e7eb", color: done || active ? "#fff" : "#9ca3af", flexShrink: 0 }}>
                              {done ? "✓" : i + 1}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? "#A020F0" : done ? "#6b7280" : "#9ca3af", whiteSpace: "nowrap" }}>{stepLabels[i]}</span>
                          </div>
                          {i < 5 && <div style={{ width: 24, height: 2, margin: "0 8px", background: done ? G : "#e5e7eb", flexShrink: 0, borderRadius: 1 }} />}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 16px rgba(160,32,240,0.06)", border: "1px solid #f0e8ff" }}>

                  {/* ETAPE 1 — PRODUIT */}
                  {step === "produit" && (
                    <div className="ani" style={{ padding: 28 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a0533", marginBottom: 20 }}>🛡️ Choisissez un produit</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
                        {PRODUCTS.map(p => (
                          <button key={p.id} onClick={() => setProduct(p.id)}
                            style={{ textAlign: "left", border: `2px solid ${product === p.id ? "#A020F0" : "#e5e7eb"}`, borderRadius: 12, padding: 16, background: product === p.id ? "#faf5ff" : "#fff", cursor: "pointer", transition: "all .15s" }}>
                            <div style={{ fontSize: 24, marginBottom: 8 }}>{p.icon}</div>
                            <p style={{ fontWeight: 700, fontSize: 13, color: "#1a0533", margin: "0 0 4px" }}>{p.label}</p>
                            <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{p.desc}</p>
                            {product === p.id && <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: "#A020F0" }}>✓ Selectionne</div>}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button onClick={() => setStep("voyage")} style={{ background: G, color: "#fff", border: "none", borderRadius: 10, padding: "11px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Suivant →</button>
                      </div>
                    </div>
                  )}

                  {/* ETAPE 2 — VOYAGE */}
                  {step === "voyage" && (
                    <div className="ani" style={{ padding: 28 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a0533", marginBottom: 20 }}>✈️ Details du voyage</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                        {product !== "avantages_pom" && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            {lbl("Zone de destination *")}
                            <select value={destination} onChange={e => setDestination(e.target.value)} style={inp()}>
                              {DESTINATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                          </div>
                        )}
                        <div>
                          {lbl("Date de depart *")}
                          <input type="date" value={departDate} onChange={e => setDepartDate(e.target.value)} min={tomorrow} style={inp()} />
                        </div>
                        <div>
                          {lbl("Date de retour *")}
                          <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} min={departDate || tomorrow} style={inp()} />
                        </div>
                        {product !== "avantages_pom" && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            {lbl("Prix du voyage total (EUR) *")}
                            <input type="number" value={tripPrice} onChange={e => setTripPrice(e.target.value)} placeholder="ex: 2500" min="0" style={inp()} />
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <button onClick={() => setStep("produit")} style={{ background: "#f3f4f6", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, color: "#374151", cursor: "pointer" }}>← Retour</button>
                        <button onClick={() => {
                          if (!departDate) { setFormError("Date de depart requise"); return; }
                          if (product !== "avantages_pom" && !tripPrice) { setFormError("Prix du voyage requis"); return; }
                          setFormError(""); setStep("infos");
                        }} style={{ background: G, color: "#fff", border: "none", borderRadius: 10, padding: "11px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Suivant →</button>
                      </div>
                      {formError && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 10 }}>{formError}</p>}
                    </div>
                  )}

                  {/* ETAPE 3 — INFOS CLIENT */}
                  {step === "infos" && (
                    <div className="ani" style={{ padding: 28 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a0533", marginBottom: 20 }}>👤 Informations du souscripteur</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                        <div>{lbl("Prenom *")}<input type="text" value={sub.firstName} onChange={e => setSub(p => ({ ...p, firstName: e.target.value }))} placeholder="Marie" style={inp()} /></div>
                        <div>{lbl("Nom *")}<input type="text" value={sub.lastName} onChange={e => setSub(p => ({ ...p, lastName: e.target.value }))} placeholder="Dupont" style={inp()} /></div>
                        <div>{lbl("Date de naissance *")}<input type="date" value={sub.birthDate} onChange={e => setSub(p => ({ ...p, birthDate: e.target.value }))} style={inp()} /></div>
                        <div>{lbl("Email client *")}<input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" style={inp()} /></div>
                        <div style={{ gridColumn: "1 / -1" }}>{lbl("Adresse *")}<input type="text" value={sub.address} onChange={e => setSub(p => ({ ...p, address: e.target.value }))} placeholder="12 rue des Fleurs" style={inp()} /></div>
                        <div>{lbl("Code postal *")}<input type="text" value={sub.postalCode} onChange={e => setSub(p => ({ ...p, postalCode: e.target.value }))} placeholder="98713" style={inp()} /></div>
                        <div>{lbl("Ville *")}<input type="text" value={sub.city} onChange={e => setSub(p => ({ ...p, city: e.target.value }))} placeholder="Papeete" style={inp()} /></div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          {lbl("Note interne (optionnel)")}
                          <textarea value={clientNote} onChange={e => setClientNote(e.target.value)} placeholder="Note admin sur cette commande..." rows={2} style={{ ...inp(), resize: "vertical" }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <button onClick={() => setStep("voyage")} style={{ background: "#f3f4f6", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, color: "#374151", cursor: "pointer" }}>← Retour</button>
                        <button onClick={() => {
                          if (!sub.firstName || !sub.lastName || !sub.birthDate || !clientEmail || !sub.address || !sub.postalCode || !sub.city) { setFormError("Tous les champs obligatoires doivent etre remplis"); return; }
                          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) { setFormError("Email invalide"); return; }
                          setFormError(""); setStep("voyageurs");
                        }} style={{ background: G, color: "#fff", border: "none", borderRadius: 10, padding: "11px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Suivant →</button>
                      </div>
                      {formError && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 10 }}>{formError}</p>}
                    </div>
                  )}

                  {/* ETAPE 4 — VOYAGEURS */}
                  {step === "voyageurs" && (
                    <div className="ani" style={{ padding: 28 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a0533", marginBottom: 4 }}>👨‍👩‍👧 Voyageurs supplementaires</h2>
                      <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>Souscripteur principal : {sub.firstName} {sub.lastName}</p>

                      {travelers.map((t, i) => (
                        <div key={i} style={{ background: "#faf5ff", borderRadius: 10, padding: 14, marginBottom: 12, border: "1px solid #e9d5ff" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <p style={{ fontWeight: 600, fontSize: 13, color: "#1a0533", margin: 0 }}>Voyageur {i + 2}</p>
                            <button onClick={() => setTravelers(prev => prev.filter((_, j) => j !== i))}
                              style={{ background: "#fee2e2", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#dc2626", cursor: "pointer" }}>Supprimer</button>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                            <div>{lbl("Prenom")}
                              <input type="text" value={t.firstName} onChange={e => { const n = [...travelers]; n[i].firstName = e.target.value; setTravelers(n); }} style={inp({ fontSize: 13, padding: "8px 12px" })} />
                            </div>
                            <div>{lbl("Nom")}
                              <input type="text" value={t.lastName} onChange={e => { const n = [...travelers]; n[i].lastName = e.target.value; setTravelers(n); }} style={inp({ fontSize: 13, padding: "8px 12px" })} />
                            </div>
                            <div>{lbl("Date de naissance")}
                              <input type="date" value={t.birthDate} onChange={e => { const n = [...travelers]; n[i].birthDate = e.target.value; setTravelers(n); }} style={inp({ fontSize: 13, padding: "8px 12px" })} />
                            </div>
                          </div>
                        </div>
                      ))}

                      <button onClick={() => setTravelers(prev => [...prev, { firstName: "", lastName: "", birthDate: "" }])}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "#f3e8ff", border: "1px dashed #A020F0", borderRadius: 9, padding: "9px 16px", fontSize: 13, color: "#A020F0", cursor: "pointer", fontWeight: 600, marginBottom: 20 }}>
                        + Ajouter un voyageur
                      </button>

                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <button onClick={() => setStep("infos")} style={{ background: "#f3f4f6", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, color: "#374151", cursor: "pointer" }}>← Retour</button>
                        <button onClick={() => { setStep("options"); }} style={{ background: G, color: "#fff", border: "none", borderRadius: 10, padding: "11px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Suivant →</button>
                      </div>
                    </div>
                  )}

                  {/* ETAPE 5 — OPTIONS */}
                  {step === "options" && (
                    <div className="ani" style={{ padding: 28 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a0533", marginBottom: 20 }}>⚙️ Options du contrat</h2>
                      {getOptions().length === 0 ? (
                        <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 20 }}>Aucune option disponible pour ce produit.</p>
                      ) : (
                        <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
                          {getOptions().map(opt => (
                            <div key={opt.id} style={{ border: "1.5px solid #e5e7eb", borderRadius: 10, padding: 14, background: "#fff" }}>
                              {opt.type === "boolean" ? (
                                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                                  <input type="checkbox" checked={selectedOptions.includes(opt.subId || opt.id)} onChange={e => toggleOption(opt.id, opt.subId)}
                                    style={{ marginTop: 2, accentColor: "#A020F0" }} />
                                  <div>
                                    <p style={{ fontWeight: 600, fontSize: 13, color: "#1a0533", margin: "0 0 2px" }}>{opt.label}</p>
                                    <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{opt.desc}</p>
                                  </div>
                                </label>
                              ) : (
                                <div>
                                  <p style={{ fontWeight: 600, fontSize: 13, color: "#1a0533", margin: "0 0 2px" }}>{opt.label}</p>
                                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 8px" }}>{opt.desc}</p>
                                  <select onChange={e => selectOption(opt.id, opt.choices || [], e.target.value)}
                                    value={(opt.choices || []).find(c => selectedOptions.includes(c.id))?.id || ""}
                                    style={inp({ fontSize: 13, padding: "7px 12px" })}>
                                    <option value="">Sans option</option>
                                    {(opt.choices || []).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                  </select>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <button onClick={() => setStep("voyageurs")} style={{ background: "#f3f4f6", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, color: "#374151", cursor: "pointer" }}>← Retour</button>
                        <button onClick={async () => { setStep("recap"); await fetchQuote(); }} style={{ background: G, color: "#fff", border: "none", borderRadius: 10, padding: "11px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Suivant →</button>
                      </div>
                    </div>
                  )}

                  {/* ETAPE 6 — RECAP */}
                  {step === "recap" && (
                    <div className="ani" style={{ padding: 28 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a0533", marginBottom: 20 }}>📋 Recapitulatif</h2>

                      <div style={{ background: "#faf5ff", borderRadius: 12, marginBottom: 20 }}>
                        {[
                          ["Produit", PRODUCTS.find(p => p.id === product)?.label || product],
                          ["Client", `${sub.firstName} ${sub.lastName}`],
                          ["Email", clientEmail],
                          ["Destination", DESTINATIONS.find(d => d.value === destination)?.label || destination],
                          ["Depart", departDate],
                          ["Retour", returnDate],
                          ["Prix voyage", tripPrice ? `${Number(tripPrice).toLocaleString("fr")} EUR` : "-"],
                          ["Voyageurs", `${1 + travelers.length} personne(s)`],
                          ["Options", selectedOptions.length > 0 ? `${selectedOptions.length} option(s)` : "Aucune"],
                        ].map(([label, value]) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #f0e8ff", fontSize: 13 }}>
                            <span style={{ color: "#6b7280" }}>{label}</span>
                            <span style={{ fontWeight: 500, color: "#1a0533" }}>{value}</span>
                          </div>
                        ))}
                        <div style={{ padding: "14px 16px" }}>
                          {loadingQuote ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 16, height: 16, border: "2px solid #e9d5ff", borderTopColor: "#A020F0", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                              <span style={{ fontSize: 13, color: "#9ca3af" }}>Calcul du tarif AVA...</span>
                            </div>
                          ) : quote ? (
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                                <span style={{ color: "#6b7280" }}>Prime AVA</span>
                                <span style={{ fontWeight: 600, color: "#1a0533" }}>{quote.toFixed(2)} EUR</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                                <span style={{ color: "#6b7280" }}>Frais FENUASIM</span>
                                <span style={{ fontWeight: 600, color: "#1a0533" }}>{FRAIS.toFixed(2)} EUR</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16 }}>
                                <span style={{ fontWeight: 700, color: "#1a0533" }}>Total TTC</span>
                                <div style={{ textAlign: "right" }}>
                                  <span style={{ fontWeight: 800, background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{(quote + FRAIS).toFixed(2)} EUR</span>
                                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>≈ {Math.round((quote + FRAIS) * EUR_TO_XPF).toLocaleString("fr")} XPF</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button onClick={fetchQuote} style={{ fontSize: 13, color: "#A020F0", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                              🔄 Recalculer le tarif
                            </button>
                          )}
                        </div>
                      </div>

                      {clientNote && (
                        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: "#92400e" }}>
                          📝 Note : {clientNote}
                        </div>
                      )}

                      {formError && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{formError}</p>}

                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <button onClick={() => setStep("options")} style={{ background: "#f3f4f6", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, color: "#374151", cursor: "pointer" }}>← Retour</button>
                        <button onClick={generateLink} disabled={generating || !quote}
                          style={{ background: generating || !quote ? "#e5e7eb" : G, color: generating || !quote ? "#9ca3af" : "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 600, cursor: generating || !quote ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                          {generating ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />Generation...</> : "Generer le lien de paiement"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ETAPE 7 — LIEN */}
                  {step === "lien" && (
                    <div className="ani" style={{ padding: 40, textAlign: "center" }}>
                      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #f3e8ff, #ffe4e6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>✓</div>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a0533", marginBottom: 6 }}>Lien de paiement cree !</h2>

                      {generatedInfo && (
                        <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 10, padding: 14, maxWidth: 480, margin: "0 auto 20px", textAlign: "left" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                            <span style={{ color: "#6b7280" }}>Adhesion AVA</span>
                            <span style={{ fontWeight: 700, color: "#A020F0" }}>{generatedInfo.adhesionNumber}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                            <span style={{ color: "#6b7280" }}>Prime AVA</span>
                            <span style={{ fontWeight: 600 }}>{generatedInfo.premiumAva?.toFixed(2)} EUR</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                            <span style={{ fontWeight: 700, color: "#1a0533" }}>Total TTC</span>
                            <span style={{ fontWeight: 800, background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{generatedInfo.totalTtc?.toFixed(2)} EUR</span>
                          </div>
                        </div>
                      )}

                      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
                        Lien envoye a <strong style={{ color: "#1a0533" }}>{clientEmail}</strong>.<br />
                        Une fois paye, les documents sont envoyes automatiquement.
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#faf5ff", border: "1.5px solid #e9d5ff", borderRadius: 10, padding: "10px 14px", maxWidth: 540, margin: "0 auto 20px" }}>
                        <span style={{ flex: 1, fontFamily: "monospace", fontSize: 11, color: "#7c3aed", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>{generatedLink}</span>
                        <button onClick={copyLink} style={{ background: copied ? "#16a34a" : G, color: "#fff", border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                          {copied ? "✓ Copie" : "Copier"}
                        </button>
                      </div>

                      <button onClick={resetForm} style={{ background: G, color: "#fff", border: "none", borderRadius: 10, padding: "11px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                        + Nouvelle commande
                      </button>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* ── TAB HISTORIQUE */}
            {activeTab === "orders" && (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f0e8ff", boxShadow: "0 2px 16px rgba(160,32,240,0.06)", overflow: "hidden" }}>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0e8ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1a0533", margin: 0 }}>Commandes assurance ({orders.length})</h2>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={exportXLS}
                      style={{ fontSize: 12, fontWeight: 600, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 7, padding: "5px 12px", cursor: "pointer" }}>
                      Bordereau XLS
                    </button>
                    <button onClick={loadOrders} style={{ fontSize: 12, color: "#A020F0", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                      Actualiser
                    </button>
                  </div>
                </div>
                {orders.length === 0 ? (
                  <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>Aucune commande</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#faf5ff" }}>
                          {["Client", "Produit", "Adhesion", "Montant", "Statut", "Debut", "Fin", "Date", "Documents"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#A020F0", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #f0e8ff", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => {
                          const s = statusConfig[order.status] || { label: order.status, bg: "#f3f4f6", color: "#374151" };
                          return (
                            <tr key={order.id} className="row-hover" style={{ borderBottom: "1px solid #faf5ff" }}>
                              <td style={{ padding: "11px 16px" }}>
                                <p style={{ fontWeight: 600, color: "#1a0533", margin: "0 0 2px", fontSize: 12 }}>{order.subscriber_first_name} {order.subscriber_last_name}</p>
                                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{order.user_email}</p>
                              </td>
                              <td style={{ padding: "11px 16px", color: "#374151", fontSize: 12 }}>{PRODUCTS.find(p => p.id === order.product_type)?.label || order.product_type}</td>
                              <td style={{ padding: "11px 16px", fontFamily: "monospace", fontSize: 11, color: "#6b7280" }}>{order.adhesion_number}</td>
                              <td style={{ padding: "11px 16px", fontWeight: 700, color: "#1a0533", fontSize: 12 }}>{order.total_amount?.toFixed(2)} EUR</td>
                              <td style={{ padding: "11px 16px" }}>
                                <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{s.label}</span>
                              </td>
                              <td style={{ padding: "11px 16px", fontSize: 11, color: "#9ca3af" }}>{order.start_date ? new Date(order.start_date).toLocaleDateString("fr-FR") : "-"}</td>
                              <td style={{ padding: "11px 16px", fontSize: 11, color: "#9ca3af" }}>{order.end_date ? new Date(order.end_date).toLocaleDateString("fr-FR") : "-"}</td>
                              <td style={{ padding: "11px 16px", fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>{new Date(order.created_at).toLocaleDateString("fr-FR")}</td>
                              <td style={{ padding: "11px 16px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  {order.contract_link ? (
                                    <a href={order.contract_link} target="_blank" rel="noopener noreferrer"
                                      style={{ fontSize: 11, color: "#A020F0", fontWeight: 600, textDecoration: "none", background: "#faf5ff", padding: "3px 8px", borderRadius: 5, border: "1px solid #e9d5ff", whiteSpace: "nowrap" }}>
                                      📄 Certificat
                                    </a>
                                  ) : null}
                                  {(order as any).attestation_url ? (
                                    <a href={(order as any).attestation_url} target="_blank" rel="noopener noreferrer"
                                      style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600, textDecoration: "none", background: "#f5f3ff", padding: "3px 8px", borderRadius: 5, border: "1px solid #ddd6fe", whiteSpace: "nowrap" }}>
                                      📋 Attestation
                                    </a>
                                  ) : null}
                                  {!order.contract_link && !(order as any).attestation_url && (
                                    <span style={{ color: "#9ca3af", fontSize: 11 }}>En attente</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
