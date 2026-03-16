// src/pages/partner/index.tsx
// Dashboard partenaire — Next.js + Supabase Auth existant
// Route : /partner

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";

interface AiraloPackage {
  id: string;
  name: string;
  description?: string;
  data_amount?: string;
  data_unit?: string;
  validity_days?: number;
  price_xpf?: number;
  final_price_xpf?: number;
  price_eur?: number;
  final_price_eur?: number;
  currency?: string;
  status?: string;
  country?: string;
  region?: string;
  region_fr?: string;
}

interface PartnerOrder {
  id: string;
  client_name: string;
  client_email: string;
  package_name: string;
  amount: number;
  currency: string;
  status: string;
  payment_url: string;
  esim_iccid?: string;
  created_at: string;
  paid_at?: string;
}

type Step = "forfait" | "client" | "recap" | "lien";

export default function PartnerDashboard() {
  const router = useRouter();
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("forfait");
  const [packages, setPackages] = useState<AiraloPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<AiraloPackage | null>(null);
  const [clientForm, setClientForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState("");
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [activeTab, setActiveTab] = useState<"new" | "orders">("new");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/partner/login"); return; }

      const { data: profile } = await supabase
        .from("partner_profiles")
        .select("*")
        .eq("email", session.user.email)
        .single();

      if (!profile || !profile.is_active) {
        await supabase.auth.signOut();
        router.push("/partner/login?error=unauthorized");
        return;
      }

      setPartnerProfile(profile);
      setLoading(false);
      loadPackages();
      loadOrders(profile.partner_code);
    };
    checkAuth();
  }, []);

  const loadPackages = async () => {
    const { data } = await supabase
      .from("airalo_packages")
      .select("id, name, data_amount, data_unit, validity_days, price_xpf, final_price_xpf, price_eur, final_price_eur, currency, status, country, region, region_fr")
      .eq("status", "active")
      .order("price_eur", { ascending: true })
      .limit(12);
    if (data) setPackages(data);
  };

  const loadOrders = async (partnerCode: string) => {
    const { data } = await supabase
      .from("partner_orders_view")
      .select("*")
      .eq("partner_code", partnerCode)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setOrders(data as PartnerOrder[]);
  };

  const generateLink = async () => {
    if (!selectedPackage || !clientForm.firstName || !clientForm.lastName || !clientForm.email) {
      setFormError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setFormError("");
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/partner/create-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          clientFirstName: clientForm.firstName,
          clientLastName: clientForm.lastName,
          clientEmail: clientForm.email,
          clientPhone: clientForm.phone,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur serveur");
      setGeneratedLink(data.paymentUrl);
      setStep("lien");
      if (partnerProfile) loadOrders(partnerProfile.partner_code);
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la génération du lien.");
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const sendViaWhatsApp = () => {
    const msg = `Bonjour ${clientForm.firstName}, voici votre lien de paiement sécurisé pour votre eSIM FenuaSIM :\n${generatedLink}`;
    window.open(`https://wa.me/${clientForm.phone?.replace(/\s/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const sendViaEmail = () => {
    const subject = "Votre lien de paiement eSIM FenuaSIM";
    const body = `Bonjour ${clientForm.firstName},\n\nVoici votre lien de paiement sécurisé pour votre forfait eSIM :\n${generatedLink}\n\nCordialement,\n${partnerProfile?.advisor_name || "L'équipe FenuaSIM"}`;
    window.location.href = `mailto:${clientForm.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const resetForm = () => {
    setStep("forfait");
    setSelectedPackage(null);
    setClientForm({ firstName: "", lastName: "", email: "", phone: "" });
    setGeneratedLink("");
    setFormError("");
  };

  const formatPrice = (pkg: AiraloPackage) => {
    // price_eur contient en réalité le prix XPF dans votre base
    const price = pkg.price_xpf || pkg.final_price_xpf || pkg.price_eur || pkg.final_price_eur || 0;
    return `${Math.round(price).toLocaleString("fr")} XPF`;
  };

  const getDestination = (pkg: AiraloPackage) => {
    return pkg.region_fr || pkg.region || pkg.country || "—";
  };

  const getValidity = (pkg: AiraloPackage) => {
    if (pkg.validity_days) return `${pkg.validity_days} jours`;
    // Extraire la validité depuis le nom ex: "illimité - 3 jours"
    const match = pkg.name.match(/(\d+)\s*jours?/i);
    if (match) return `${match[1]} jours`;
    const matchDays = pkg.name.match(/(\d+)\s*days?/i);
    if (matchDays) return `${matchDays[1]} jours`;
    return "";
  };

  const getData = (pkg: AiraloPackage) => {
    if (pkg.data_amount && pkg.data_amount !== "illimité") return `${pkg.data_amount} ${pkg.data_unit || "Go"}`;
    if (pkg.data_unit === "illimité" || pkg.data_unit === "unlimited") return "Illimité";
    if (pkg.data_amount) return `${pkg.data_amount} ${pkg.data_unit || "Go"}`;
    return pkg.data_unit || "Illimité";
  };

  const statusLabel: Record<string, { label: string; style: string }> = {
    pending:   { label: "⏳ En attente", style: "bg-amber-100 text-amber-700" },
    paid:      { label: "💳 Payé",        style: "bg-blue-100 text-blue-700" },
    esim_sent: { label: "✓ eSIM envoyée", style: "bg-green-100 text-green-700" },
    error:     { label: "✗ Erreur",       style: "bg-red-100 text-red-700" },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head><title>Espace Partenaire — FenuaSIM</title></Head>
      <div className="min-h-screen bg-gray-50 flex">

        {/* ── Sidebar */}
        <aside className="w-56 bg-[#0a4a6e] flex flex-col shrink-0">
          <div className="px-5 py-6 border-b border-white/10">
            <span className="text-white font-semibold text-lg">Fenua<span className="text-cyan-400">SIM</span></span>
            <p className="text-white/50 text-xs mt-1">Espace partenaire</p>
          </div>
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-white text-sm font-medium">{partnerProfile?.advisor_name}</p>
            <p className="text-white/50 text-xs mt-0.5">Code : {partnerProfile?.partner_code}</p>
          </div>
          <nav className="flex-1 py-3">
            <button onClick={() => { setActiveTab("new"); resetForm(); }}
              className={`w-full text-left px-5 py-2.5 text-sm flex items-center gap-2.5 border-l-2 transition-all ${activeTab === "new" ? "border-cyan-400 bg-white/10 text-white font-medium" : "border-transparent text-white/60 hover:text-white hover:bg-white/5"}`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
              Nouvelle commande
            </button>
            <button onClick={() => setActiveTab("orders")}
              className={`w-full text-left px-5 py-2.5 text-sm flex items-center gap-2.5 border-l-2 transition-all ${activeTab === "orders" ? "border-cyan-400 bg-white/10 text-white font-medium" : "border-transparent text-white/60 hover:text-white hover:bg-white/5"}`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>
              Mes commandes
            </button>
          </nav>
          <div className="p-4">
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/partner/login"); }}
              className="w-full py-2 text-xs text-white/50 hover:text-white border border-white/10 rounded-lg transition-colors">
              Déconnexion
            </button>
          </div>
        </aside>

        {/* ── Main */}
        <main className="flex-1 flex flex-col overflow-auto">
          <header className="bg-white border-b border-gray-200 px-8 h-14 flex items-center justify-between shrink-0">
            <h1 className="font-semibold text-gray-800">{activeTab === "new" ? "Nouvelle commande" : "Mes commandes"}</h1>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />Connecté
            </span>
          </header>

          <div className="p-8 flex-1">

            {/* ── TAB NOUVELLE COMMANDE */}
            {activeTab === "new" && (
              <div className="max-w-3xl mx-auto">

                {/* Stepper */}
                <div className="flex items-center mb-8">
                  {(["forfait", "client", "recap", "lien"] as Step[]).map((s, i) => {
                    const idx = ["forfait", "client", "recap", "lien"].indexOf(step);
                    const done = i < idx;
                    const active = i === idx;
                    const labels = ["Forfait", "Client", "Récapitulatif", "Lien généré"];
                    return (
                      <div key={s} className="flex items-center">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${done ? "bg-[#0a4a6e] border-[#0a4a6e] text-white" : active ? "bg-cyan-400 border-cyan-400 text-white" : "border-gray-300 text-gray-400"}`}>
                            {done ? "✓" : i + 1}
                          </div>
                          <span className={`text-sm hidden sm:block ${active ? "text-[#0a4a6e] font-medium" : done ? "text-gray-600" : "text-gray-400"}`}>{labels[i]}</span>
                        </div>
                        {i < 3 && <div className={`mx-3 h-0.5 w-12 sm:w-16 flex-shrink-0 ${done ? "bg-[#0a4a6e]" : "bg-gray-200"}`} />}
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

                  {/* ÉTAPE 1 : FORFAIT */}
                  {step === "forfait" && (
                    <div className="p-6">
                      <h2 className="font-semibold text-gray-800 mb-4">Choisissez un forfait</h2>
                      {packages.length === 0 ? (
                        <p className="text-gray-400 text-sm py-8 text-center">Chargement des forfaits...</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                          {packages.map((pkg) => (
                            <button key={pkg.id} onClick={() => setSelectedPackage(pkg)}
                              className={`relative text-left border-2 rounded-xl p-4 transition-all ${selectedPackage?.id === pkg.id ? "border-[#0a4a6e] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                              {selectedPackage?.id === pkg.id && <span className="absolute top-2 right-2 text-[#0a4a6e] font-bold text-sm">✓</span>}
                              <p className="font-semibold text-gray-800 text-sm mb-0.5 pr-4">{getDestination(pkg)}</p>
                              <p className="text-lg font-bold text-[#0a4a6e] leading-none">{getData(pkg)}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{getValidity(pkg)}</p>
                              <p className="text-sm font-semibold text-[#0a4a6e] mt-2 pt-2 border-t border-gray-100">{formatPrice(pkg)}</p>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-end">
                        <button onClick={() => setStep("client")} disabled={!selectedPackage}
                          className="bg-[#0a4a6e] text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0e6899] transition-colors">
                          Suivant →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ÉTAPE 2 : CLIENT */}
                  {step === "client" && (
                    <div className="p-6">
                      <h2 className="font-semibold text-gray-800 mb-4">Informations du client</h2>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">Prénom *</label>
                          <input type="text" value={clientForm.firstName} onChange={e => setClientForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Marie"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0a4a6e]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom *</label>
                          <input type="text" value={clientForm.lastName} onChange={e => setClientForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Dupont"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0a4a6e]" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">Email *</label>
                          <input type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} placeholder="marie.dupont@email.com"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0a4a6e]" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">Téléphone <span className="text-gray-400">(optionnel, pour WhatsApp)</span></label>
                          <input type="tel" value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} placeholder="+689 87 XX XX XX"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0a4a6e]" />
                        </div>
                      </div>
                      <div className="border-2 border-[#0a4a6e] rounded-xl p-4 bg-blue-50 mb-4">
                        <div className="flex items-start gap-3">
                          <input type="radio" checked readOnly className="mt-0.5 accent-[#0a4a6e]" />
                          <div>
                            <p className="text-sm font-semibold text-gray-800">🔗 Lien de paiement sécurisé (Stripe)</p>
                            <p className="text-xs text-gray-500 mt-0.5">Un lien est généré et envoyé au client. Il règle depuis son appareil. Aucune carte bancaire ne transite par vous.</p>
                          </div>
                        </div>
                      </div>
                      {formError && <p className="text-red-500 text-xs mb-3">{formError}</p>}
                      <div className="flex justify-between">
                        <button onClick={() => setStep("forfait")} className="px-5 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors">← Retour</button>
                        <button onClick={() => {
                          if (!clientForm.firstName || !clientForm.lastName || !clientForm.email) { setFormError("Prénom, nom et email sont obligatoires."); return; }
                          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientForm.email)) { setFormError("Adresse email invalide."); return; }
                          setFormError(""); setStep("recap");
                        }} className="bg-[#0a4a6e] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0e6899] transition-colors">
                          Suivant →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ÉTAPE 3 : RÉCAPITULATIF */}
                  {step === "recap" && selectedPackage && (
                    <div className="p-6">
                      <h2 className="font-semibold text-gray-800 mb-4">Récapitulatif</h2>
                      <div className="bg-gray-50 rounded-xl p-4 mb-5 divide-y divide-gray-200">
                        {[
                          ["Client", `${clientForm.firstName} ${clientForm.lastName}`],
                          ["Email", clientForm.email],
                          ["Téléphone", clientForm.phone || "—"],
                          ["Forfait", selectedPackage.name],
                          ["Destination", getDestination(selectedPackage)],
                          ["Données", getData(selectedPackage)],
                          ["Validité", getValidity(selectedPackage)],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between py-2.5 text-sm">
                            <span className="text-gray-400">{label}</span>
                            <span className="text-gray-700 font-medium">{value}</span>
                          </div>
                        ))}
                        <div className="flex justify-between py-3 text-base">
                          <span className="text-gray-500 font-medium">Total</span>
                          <span className="font-bold text-[#0a4a6e]">{formatPrice(selectedPackage)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mb-5">
                        Un lien de paiement Stripe sera généré instantanément, valable 24h.
                        Une fois le paiement effectué, le QR code eSIM sera envoyé automatiquement à {clientForm.email}.
                      </p>
                      {formError && <p className="text-red-500 text-xs mb-3">{formError}</p>}
                      <div className="flex justify-between">
                        <button onClick={() => setStep("client")} className="px-5 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors">← Retour</button>
                        <button onClick={generateLink} disabled={generating}
                          className="bg-[#0a4a6e] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0e6899] transition-colors disabled:opacity-60 flex items-center gap-2">
                          {generating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Génération...</> : "Générer le lien de paiement"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ÉTAPE 4 : LIEN GÉNÉRÉ */}
                  {step === "lien" && (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-800 mb-1">Lien de paiement prêt !</h2>
                      <p className="text-gray-500 text-sm mb-6">
                        Partagez ce lien avec <strong>{clientForm.firstName} {clientForm.lastName}</strong>.<br/>
                        Une fois le paiement effectué, l'eSIM sera envoyée automatiquement à {clientForm.email}.
                      </p>
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5 max-w-lg mx-auto">
                        <span className="flex-1 font-mono text-xs text-[#0a4a6e] truncate text-left">{generatedLink}</span>
                        <button onClick={copyLink}
                          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${copied ? "bg-green-600 text-white" : "bg-[#0a4a6e] text-white hover:bg-[#0e6899]"}`}>
                          {copied ? "✓ Copié" : "Copier"}
                        </button>
                      </div>
                      <div className="flex gap-3 justify-center flex-wrap mb-6">
                        <button onClick={sendViaEmail} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-[#0a4a6e] hover:text-[#0a4a6e] transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          Envoyer par email
                        </button>
                        {clientForm.phone && (
                          <button onClick={sendViaWhatsApp} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-green-500 hover:text-green-600 transition-colors">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.525 5.847L.057 24l6.306-1.54A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.374l-.36-.214-3.722.909.944-3.619-.234-.372A9.818 9.818 0 0 1 2.18 12 9.82 9.82 0 0 1 12 2.182 9.82 9.82 0 0 1 21.818 12 9.82 9.82 0 0 1 12 21.818z"/></svg>
                            WhatsApp
                          </button>
                        )}
                      </div>
                      <button onClick={resetForm} className="bg-[#0a4a6e] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0e6899] transition-colors">
                        + Nouvelle commande
                      </button>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* ── TAB COMMANDES */}
            {activeTab === "orders" && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800">Historique des commandes</h2>
                  <button onClick={() => loadOrders(partnerProfile?.partner_code)} className="text-xs text-gray-400 hover:text-gray-600">↻ Actualiser</button>
                </div>
                {orders.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 text-sm">Aucune commande pour l'instant</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <th className="text-left px-5 py-3 font-medium">Client</th>
                          <th className="text-left px-5 py-3 font-medium">Forfait</th>
                          <th className="text-left px-5 py-3 font-medium">Montant</th>
                          <th className="text-left px-5 py-3 font-medium">Statut</th>
                          <th className="text-left px-5 py-3 font-medium">ICCID</th>
                          <th className="text-left px-5 py-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {orders.map((order) => {
                          const s = statusLabel[order.status] || { label: order.status, style: "bg-gray-100 text-gray-600" };
                          return (
                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-5 py-3.5">
                                <p className="font-medium text-gray-800">{order.client_name}</p>
                                <p className="text-xs text-gray-400">{order.client_email}</p>
                              </td>
                              <td className="px-5 py-3.5 text-gray-600">{order.package_name}</td>
                              <td className="px-5 py-3.5 font-medium text-gray-700">
                                {order.currency === "xpf" ? `${order.amount.toLocaleString("fr")} XPF` : `${(order.amount / 100).toFixed(2)} €`}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.style}`}>{s.label}</span>
                              </td>
                              <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{order.esim_iccid || "—"}</td>
                              <td className="px-5 py-3.5 text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString("fr-FR")}</td>
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
