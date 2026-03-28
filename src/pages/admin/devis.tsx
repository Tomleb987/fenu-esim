// ============================================================
// FENUA SIM – Générateur de Devis & Factures
// src/pages/admin/devis.tsx
// ============================================================

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";
import { FileText, Download, Plus, Trash2, ChevronLeft, LogOut } from "lucide-react";

const ADMIN_EMAILS = ["admin@fenuasim.com", "hello@fenuasim.com", "tomleb987@gmail.com"];
const isAdmin = (e?: string | null) => !!e && (ADMIN_EMAILS.includes(e) || e.endsWith("@fenuasim.com"));
const G = "linear-gradient(135deg, #A020F0 0%, #FF4D6D 50%, #FF7F11 100%)";
const inputCls = "w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";

interface Line {
  id:           string;
  description:  string;
  qty:          string;
  unite:        string;
  prixUnitaire: string;
  currency:     string;
}

const newLine = (): Line => ({
  id:           crypto.randomUUID(),
  description:  "",
  qty:          "1",
  unite:        "Unite(s)",
  prixUnitaire: "",
  currency:     "EUR",
});

export default function AdminDevis() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [generating,  setGenerating]  = useState(false);

  // Formulaire
  const [docType,       setDocType]       = useState<"devis" | "facture">("devis");
  const [vendeur,       setVendeur]       = useState("Support FENUA SIM");
  const [clientName,    setClientName]    = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCity,    setClientCity]    = useState("");
  const [clientCountry, setClientCountry] = useState("");
  const [date,          setDate]          = useState(new Date().toLocaleDateString("fr-FR"));
  const [echeance,      setEcheance]      = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toLocaleDateString("fr-FR");
  });
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!router.isReady) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || !isAdmin(session.user?.email)) router.push("/admin/login");
      else setAuthChecked(true);
    });
  }, [router.isReady]);

  const updateLine = (id: string, field: keyof Line, val: string) =>
    setLines(ls => ls.map(l => l.id === id ? { ...l, [field]: val } : l));

  const removeLine = (id: string) =>
    setLines(ls => ls.length > 1 ? ls.filter(l => l.id !== id) : ls);

  const total = lines.reduce((s, l) => {
    const qty = parseFloat(l.qty) || 0;
    const pu  = parseFloat(l.prixUnitaire) || 0;
    return s + qty * pu;
  }, 0);

  const currency = lines[0]?.currency ?? "EUR";
  const fmtTotal = currency === "XPF"
    ? `${Math.round(total).toLocaleString("fr-FR")} XPF`
    : `${total.toFixed(2).replace(".", ",")} EUR`;

  const handleGenerate = async () => {
    if (!clientName.trim()) { alert("Nom du client requis"); return; }
    if (lines.some(l => !l.description.trim() || !l.prixUnitaire)) {
      alert("Remplis toutes les lignes"); return;
    }

    setGenerating(true);
    try {
      const payload = {
        mode:          "direct",
        docType,
        docNumber:     "",  // sera généré côté API
        date,
        echeance,
        vendeur,
        clientName,
        clientAddress,
        clientCity,
        clientCountry,
        lines: lines.map(l => ({
          description:  l.description,
          qty:          parseFloat(l.qty) || 1,
          unite:        l.unite,
          prixUnitaire: parseFloat(l.prixUnitaire) || 0,
          montant:      (parseFloat(l.qty) || 1) * (parseFloat(l.prixUnitaire) || 0),
          currency:     l.currency,
        })),
        notes: notes.trim() || undefined,
      };

      const res = await fetch("/api/admin/generate-invoice", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Erreur : " + (err.error || "Génération échouée"));
        return;
      }

      const blob     = await res.blob();
      const url      = URL.createObjectURL(blob);
      const label    = docType === "devis" ? "devis" : "facture";
      const a        = document.createElement("a");
      a.href         = url;
      a.download     = `${label}-${clientName.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setClientName(""); setClientAddress(""); setClientCity(""); setClientCountry("");
    setLines([newLine()]); setNotes("");
  };

  if (!authChecked) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <Head><title>Devis & Factures — FENUA SIM</title><meta name="robots" content="noindex" /></Head>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <a href="/admin" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors">
                <ChevronLeft size={14} /> Admin
              </a>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: G }}>
                  <FileText size={16} className="text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-gray-900">Devis & Factures</h1>
                  <p className="text-xs text-gray-400">Génération PDF FENUA SIM</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push("/admin/login"))}
              className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-400 hover:text-red-500">
              <LogOut size={12} /> Déconnexion
            </button>
          </div>

          <div className="space-y-5">

            {/* Type de document */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className={labelCls}>Type de document</p>
              <div className="flex gap-2">
                {(["devis", "facture"] as const).map(t => (
                  <button key={t} onClick={() => setDocType(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${docType === t ? "text-white shadow" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}
                    style={docType === t ? { background: G } : {}}>
                    {t === "devis" ? "📋 Devis" : "🧾 Facture"}
                  </button>
                ))}
              </div>
            </div>

            {/* Infos document */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className={labelCls}>Informations document</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Date</label>
                  <input value={date} onChange={e => setDate(e.target.value)} className={inputCls} placeholder="JJ/MM/AAAA" />
                </div>
                <div>
                  <label className={labelCls}>Échéance</label>
                  <input value={echeance} onChange={e => setEcheance(e.target.value)} className={inputCls} placeholder="JJ/MM/AAAA" />
                </div>
                <div>
                  <label className={labelCls}>Vendeur</label>
                  <input value={vendeur} onChange={e => setVendeur(e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>

            {/* Client */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className={labelCls}>Client</p>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Nom / Raison sociale *</label>
                  <input value={clientName} onChange={e => setClientName(e.target.value)} className={inputCls} placeholder="PORSCHE SIA" />
                </div>
                <div>
                  <label className={labelCls}>Adresse</label>
                  <input value={clientAddress} onChange={e => setClientAddress(e.target.value)} className={inputCls} placeholder="111 rue Roger Gervolino" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Ville</label>
                    <input value={clientCity} onChange={e => setClientCity(e.target.value)} className={inputCls} placeholder="Noumea 98800" />
                  </div>
                  <div>
                    <label className={labelCls}>Pays</label>
                    <input value={clientCountry} onChange={e => setClientCountry(e.target.value)} className={inputCls} placeholder="Nouvelle-Calédonie" />
                  </div>
                </div>
              </div>
            </div>

            {/* Lignes */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className={labelCls}>Lignes</p>
              </div>

              {/* En-tête colonnes */}
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-5"><p className="text-xs text-gray-400 uppercase tracking-wide">Description</p></div>
                <div className="col-span-1"><p className="text-xs text-gray-400 uppercase tracking-wide">Qté</p></div>
                <div className="col-span-2"><p className="text-xs text-gray-400 uppercase tracking-wide">Unité</p></div>
                <div className="col-span-2"><p className="text-xs text-gray-400 uppercase tracking-wide">P.U.</p></div>
                <div className="col-span-1"><p className="text-xs text-gray-400 uppercase tracking-wide">Devise</p></div>
                <div className="col-span-1"></div>
              </div>

              <div className="space-y-2">
                {lines.map(line => {
                  const mt = (parseFloat(line.qty) || 0) * (parseFloat(line.prixUnitaire) || 0);
                  return (
                    <div key={line.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <input value={line.description} onChange={e => updateLine(line.id, "description", e.target.value)}
                          className={inputCls} placeholder="eSIM ASIE - 7 jours illimites" />
                      </div>
                      <div className="col-span-1">
                        <input type="number" value={line.qty} onChange={e => updateLine(line.id, "qty", e.target.value)}
                          className={inputCls} min="0" step="0.01" />
                      </div>
                      <div className="col-span-2">
                        <select value={line.unite} onChange={e => updateLine(line.id, "unite", e.target.value)} className={inputCls}>
                          <option>Unite(s)</option>
                          <option>Jour(s)</option>
                          <option>Mois</option>
                          <option>Heure(s)</option>
                          <option>Forfait</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input type="number" value={line.prixUnitaire} onChange={e => updateLine(line.id, "prixUnitaire", e.target.value)}
                          className={inputCls} min="0" step="0.01" placeholder="25.00" />
                      </div>
                      <div className="col-span-1">
                        <select value={line.currency} onChange={e => updateLine(line.id, "currency", e.target.value)} className={inputCls}>
                          <option value="EUR">EUR</option>
                          <option value="XPF">XPF</option>
                        </select>
                      </div>
                      <div className="col-span-1 flex items-center justify-between">
                        <span className="text-xs text-gray-500 tabular-nums">
                          {line.currency === "XPF" ? Math.round(mt).toLocaleString("fr-FR") : mt.toFixed(2)}
                        </span>
                        <button onClick={() => removeLine(line.id)} className="text-gray-300 hover:text-red-400 ml-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button onClick={() => setLines(ls => [...ls, newLine()])}
                className="mt-3 flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors">
                <Plus size={13} /> Ajouter une ligne
              </button>

              {/* Total */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total</p>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: "#A020F0" }}>{fmtTotal}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <label className={labelCls}>Notes / Conditions spéciales</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className={inputCls + " resize-none"} placeholder="Ex: Paiement par virement sous 30 jours..." />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button onClick={handleGenerate} disabled={generating}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-semibold text-sm shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ background: G }}>
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Génération...</>
                ) : (
                  <><Download size={16} /> Télécharger le {docType === "devis" ? "devis" : "la facture"} PDF</>
                )}
              </button>
              <button onClick={handleReset}
                className="px-4 py-3 rounded-2xl text-sm text-gray-500 border border-gray-200 bg-white hover:bg-gray-50">
                Réinitialiser
              </button>
            </div>

          </div>

          <p className="text-xs text-gray-300 text-center mt-10 mb-4">
            FENUASIM · Générateur de documents · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </>
  );
}

AdminDevis.getLayout = (page: ReactElement) => page;
