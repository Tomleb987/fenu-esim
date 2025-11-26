// src/pages/assurance.tsx
import React, { useState, useEffect } from "react";
import Head from "next/head";
import { AVA_PRODUCTS, getOptionsForProduct } from "@/lib/ava_options";
import { COUNTRIES } from "@/lib/countries";
import {
  ShieldCheck,
  Calendar,
  User,
  CheckCircle,
  ArrowRight,
  Loader2,
  Plus,
  Trash2,
  FileText,
  Calculator,
  Edit3
} from "lucide-react";

type Companion = {
  firstName: string;
  lastName: string;
  birthDate: string;
};

const IPID_BY_PRODUCT: Record<string, { label: string; href: string }> = {
  ava_tourist_card: { label: "IPID – Tourist Card", href: "/docs/ava/FP-AVA-TOURIST-CARD.pdf" },
  ava_carte_sante: { label: "IPID – Carte Santé", href: "/docs/ava/FP-AVA-CARTE-SANTE.pdf" },
  plan_sante_working_holiday_pvt: { label: "IPID – Plan Santé PVT", href: "/docs/ava/FP-PLAN-SANTE-PVT.pdf" },
  plan_sante_diginomad: { label: "IPID – DigiNomad", href: "/docs/ava/FP-PLAN-SANTE-DIGINOMAD.pdf" },
};

export default function AssurancePage() {
  const [loading, setLoading] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(true);
  
  // --- NOUVEAU STATE : Est-ce que le devis est affiché ? ---
  const [isQuoteReady, setIsQuoteReady] = useState(false);

  const [productType, setProductType] = useState("ava_tourist_card");
  const [dates, setDates] = useState({ start: "", end: "" });
  const [subscriber, setSubscriber] = useState({
    firstName: "", lastName: "", email: "", birthDate: "",
    countryCode: "PF", address: { street: "", zip: "", city: "" },
  });

  const [companions, setCompanions] = useState<Companion[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [tripCostPerPerson, setTripCostPerPerson] = useState<number | "">("");

  // Calculs
  const totalTravelers = 1 + companions.length;
  const totalTripCost = tripCostPerPerson === "" ? 0 : tripCostPerPerson * totalTravelers;
  
  // Estimation du prix de l'assurance (Simulation simple pour l'affichage)
  // Note: Le VRAI prix sera calculé par AVA lors du paiement, mais ici on affiche une estimation ou le montant assuré
  // Si vous avez une grille tarifaire, vous pouvez l'implémenter ici.
  // Pour l'instant, on affiche le "Montant Assuré" comme référence principale.

  const currentOptionsList = getOptionsForProduct(productType);
  const currentProductInfo = AVA_PRODUCTS.find((p) => p.id === productType);
  const currentIpid = IPID_BY_PRODUCT[productType];

  useEffect(() => { setSelectedOptions({}); setIsQuoteReady(false); }, [productType]);

  const formatDateFR = (val: string) => {
    if (!val) return "--";
    try { return new Date(val).toLocaleDateString("fr-FR"); } catch { return val; }
  };

  // Gestionnaires (Identiques)
  const handleOptionChange = (optionId: string, subOptionId: string | null) => {
    const newOptions = { ...selectedOptions };
    if (subOptionId === null) delete newOptions[optionId];
    else newOptions[optionId] = subOptionId;
    setSelectedOptions(newOptions);
  };

  const addCompanion = () => setCompanions(prev => [...prev, { firstName: "", lastName: "", birthDate: "" }]);
  const updateCompanion = (index: number, field: keyof Companion, value: string) => {
    setCompanions(prev => { const c = [...prev]; c[index] = { ...c[index], [field]: value }; return c; });
  };
  const removeCompanion = (index: number) => setCompanions(prev => prev.filter((_, i) => i !== index));

  // --- ACTION 1 : CALCULER LE DEVIS ---
  const handleCalculateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation basique
    if (!dates.start || !dates.end) { alert("Veuillez sélectionner les dates."); return; }
    if (!subscriber.lastName || !subscriber.email) { alert("Veuillez remplir les informations de l'assuré."); return; }
    if (tripCostPerPerson === "") { alert("Merci de renseigner le coût du voyage."); return; }

    // Si tout est bon, on affiche le mode "Prêt à payer"
    setIsQuoteReady(true);
    // Scroll vers le résumé
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- ACTION 2 : PAYER ---
  const handlePayment = async () => {
    setLoading(true);
    try {
      const formattedOptions: Record<string, Record<string, string>> = {};
      Object.entries(selectedOptions).forEach(([optId, subOptId]) => {
        const map: Record<string, string> = {};
        map["0"] = subOptId;
        formattedOptions[optId] = map;
      });

      const res = await fetch("/api/insurance-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteData: {
            productType,
            startDate: dates.start,
            endDate: dates.end,
            destinationRegion: 102,
            tripCost: totalTripCost,
            subscriber,
            companions,
            options: formattedOptions,
          },
          userEmail: subscriber.email,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erreur : " + (data.error || "Impossible de lancer le paiement"));
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur technique est survenue.");
    } finally {
      setLoading(false);
    }
  };

  // Modale de sélection (Identique)
  const OfferSelectionModal = () => {
    if (!offerModalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-4xl p-6 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300">
          <h2 className="text-2xl font-bold text-center text-purple-900 mb-2">Quel est votre type de voyage ?</h2>
          <p className="text-gray-500 text-center mb-8">Sélectionnez l'offre adaptée pour commencer</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVA_PRODUCTS.map((product) => (
              <button key={product.id} onClick={() => { setProductType(product.id); setOfferModalOpen(false); }}
                className="text-left p-4 rounded-2xl border-2 border-gray-100 hover:border-purple-500 hover:bg-purple-50 transition-all flex gap-4 items-start group">
                <div className="text-4xl group-hover:scale-110 transition-transform">{product.icon}</div>
                <div>
                  <div className="font-bold text-gray-900">{product.title}</div>
                  <div className="text-xs text-purple-700 font-semibold uppercase mt-1">{product.subtitle}</div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setOfferModalOpen(false)} className="block mt-6 mx-auto text-sm text-gray-400 hover:text-gray-600 underline">
            Passer cette étape
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head><title>Assurance Voyage | Fenuasim</title></Head>
      <OfferSelectionModal />

      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-7xl mx-auto">
          
          {/* En-tête */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Voyagez l&apos;esprit tranquille 🛡️</h1>
            <p className="text-gray-500 mt-2">Assurance médicale, rapatriement et bagages.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* --- COLONNE GAUCHE : FORMULAIRE --- */}
            <div className={`lg:col-span-2 space-y-6 ${isQuoteReady ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''} transition-all duration-500`}>
              
              {/* Formulaire (Désactivé visuellement si devis prêt) */}
              <form id="insurance-form" onSubmit={handleCalculateQuote}>
                
                {/* 1. Choix Produit */}
                <section className="mb-8">
                  <h2 className="flex items-center text-lg font-bold text-gray-800 mb-4">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">1</span>
                    Votre formule
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {AVA_PRODUCTS.map((product) => (
                      <div key={product.id} onClick={() => !isQuoteReady && setProductType(product.id)}
                        className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all flex flex-col h-full ${productType === product.id ? "border-purple-600 bg-white shadow-md ring-1 ring-purple-600" : "border-gray-200 bg-white hover:border-purple-300"}`}>
                        {productType === product.id && <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">CHOISI</div>}
                        <div className="text-3xl mb-2">{product.icon}</div>
                        <div className="font-bold text-gray-900">{product.title}</div>
                        <div className="text-xs text-purple-700 font-semibold uppercase">{product.subtitle}</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 2. Dates & Coût */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                  <h2 className="flex items-center text-lg font-bold text-gray-800 mb-4">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">2</span>
                    Détails du voyage
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Départ</label>
                      <input type="date" required className="w-full p-3 border rounded-lg bg-gray-50" onChange={(e) => setDates({...dates, start: e.target.value})} disabled={isQuoteReady}/>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Retour</label>
                      <input type="date" required className="w-full p-3 border rounded-lg bg-gray-50" onChange={(e) => setDates({...dates, end: e.target.value})} disabled={isQuoteReady}/>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Coût / Pers. (€)</label>
                      <input type="number" required min="0" step="100" className="w-full p-3 border rounded-lg bg-gray-50" 
                        value={tripCostPerPerson} 
                        onChange={(e) => setTripCostPerPerson(e.target.value === "" ? "" : Number(e.target.value))} 
                        disabled={isQuoteReady}
                      />
                    </div>
                  </div>
                </section>

                {/* 3. Assuré */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                  <h2 className="flex items-center text-lg font-bold text-gray-800 mb-4">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">3</span>
                    Vos informations
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input placeholder="Prénom" required className="p-3 border rounded-lg" onChange={(e) => setSubscriber({...subscriber, firstName: e.target.value})} disabled={isQuoteReady}/>
                    <input placeholder="Nom" required className="p-3 border rounded-lg" onChange={(e) => setSubscriber({...subscriber, lastName: e.target.value})} disabled={isQuoteReady}/>
                    <input type="date" required className="p-3 border rounded-lg" onChange={(e) => setSubscriber({...subscriber, birthDate: e.target.value})} disabled={isQuoteReady}/>
                    <input type="email" placeholder="Email" required className="p-3 border rounded-lg" onChange={(e) => setSubscriber({...subscriber, email: e.target.value})} disabled={isQuoteReady}/>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select className="p-3 border rounded-lg bg-white" value={subscriber.countryCode} onChange={(e) => setSubscriber({...subscriber, countryCode: e.target.value})} disabled={isQuoteReady}>
                      {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                    <input placeholder="Adresse complète" required className="p-3 border rounded-lg" onChange={(e) => setSubscriber({...subscriber, address: {...subscriber.address, street: e.target.value}})} disabled={isQuoteReady}/>
                    <div className="grid grid-cols-2 gap-2">
                        <input placeholder="Code Postal" required className="p-3 border rounded-lg" onChange={(e) => setSubscriber({...subscriber, address: {...subscriber.address, zip: e.target.value}})} disabled={isQuoteReady}/>
                        <input placeholder="Ville" required className="p-3 border rounded-lg" onChange={(e) => setSubscriber({...subscriber, address: {...subscriber.address, city: e.target.value}})} disabled={isQuoteReady}/>
                    </div>
                  </div>
                </section>

                {/* 4. Options & Voyageurs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Voyageurs sup */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-700 flex items-center"><User className="w-4 h-4 mr-2"/> Voyageurs</h3>
                            <button type="button" onClick={addCompanion} disabled={isQuoteReady} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 disabled:opacity-50">
                                + Ajouter
                            </button>
                        </div>
                        {companions.length === 0 ? <p className="text-sm text-gray-400 italic">Solo</p> : (
                            <div className="space-y-2">
                                {companions.map((c, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input placeholder="Prénom" className="w-full p-2 border rounded text-sm" onChange={(e) => updateCompanion(i, "firstName", e.target.value)} disabled={isQuoteReady}/>
                                        <input placeholder="Nom" className="w-full p-2 border rounded text-sm" onChange={(e) => updateCompanion(i, "lastName", e.target.value)} disabled={isQuoteReady}/>
                                        <button type="button" onClick={() => removeCompanion(i)} disabled={isQuoteReady}><Trash2 className="w-4 h-4 text-red-400"/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Options */}
                    {currentOptionsList.length > 0 && (
                        <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                            <h3 className="font-bold text-indigo-900 mb-4 flex items-center"><ShieldCheck className="w-4 h-4 mr-2"/> Options</h3>
                            <div className="space-y-3">
                                {currentOptionsList.map((opt) => (
                                    <div key={opt.id} className="flex items-center justify-between bg-white p-2 rounded border border-indigo-50">
                                        <label className="text-sm text-gray-700 flex-1 cursor-pointer">
                                            {opt.type === 'boolean' && <input type="checkbox" className="mr-2" checked={!!selectedOptions[opt.id]} onChange={(e) => handleOptionChange(opt.id, e.target.checked ? opt.defaultSubOptionId || opt.id : null)} disabled={isQuoteReady}/>}
                                            {opt.label}
                                        </label>
                                        {opt.type === 'select' && (
                                            <select className="text-xs border rounded p-1 max-w-[120px]" value={selectedOptions[opt.id] || ""} onChange={(e) => handleOptionChange(opt.id, e.target.value || null)} disabled={isQuoteReady}>
                                                <option value="">--</option>
                                                {opt.subOptions?.map(sub => <option key={sub.id} value={sub.id}>{sub.label}</option>)}
                                            </select>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

              </form>
            </div>

            {/* --- COLONNE DROITE : RÉSUMÉ & ACTIONS --- */}
            <div className="lg:col-span-1">
              <div className={`bg-white p-6 rounded-2xl shadow-xl border transition-all duration-500 sticky top-6 ${isQuoteReady ? 'border-green-500 ring-2 ring-green-100 transform scale-105' : 'border-gray-100'}`}>
                
                {/* En-tête carte */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                  <div className="text-4xl bg-purple-50 w-16 h-16 flex items-center justify-center rounded-2xl shadow-inner">
                    {currentProductInfo?.icon}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg leading-tight">{currentProductInfo?.title}</div>
                    <div className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded mt-1 inline-block">
                      {currentProductInfo?.subtitle}
                    </div>
                  </div>
                </div>

                {/* Détails */}
                <div className="space-y-3 text-sm mb-8">
                  <div className="flex justify-between py-2 border-b border-dashed border-gray-100">
                    <span className="text-gray-500">Voyageurs</span>
                    <span className="font-medium text-gray-900">{totalTravelers} pers.</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-dashed border-gray-100">
                    <span className="text-gray-500">Dates</span>
                    <span className="font-medium text-gray-900 text-right">
                      {dates.start ? formatDateFR(dates.start) : "--"} <br/> au {dates.end ? formatDateFR(dates.end) : "--"}
                    </span>
                  </div>
                  {totalTripCost > 0 && (
                    <div className="flex justify-between py-2 border-b border-dashed border-gray-100">
                        <span className="text-gray-500">Valeur assurée</span>
                        <span className="font-medium text-gray-900">{totalTripCost} €</span>
                    </div>
                  )}
                </div>

                {/* ZONE D'ACTION */}
                <div className="space-y-3">
                    {/* SI PAS ENCORE PRÊT -> BOUTON CALCULER */}
                    {!isQuoteReady ? (
                        <button
                            type="submit"
                            form="insurance-form" // Lie ce bouton au formulaire à gauche
                            className="w-full py-4 rounded-xl bg-purple-600 text-white font-bold text-lg shadow-lg hover:bg-purple-700 transition-all flex items-center justify-center"
                        >
                            <Calculator className="mr-2 h-5 w-5" />
                            Obtenir mon tarif
                        </button>
                    ) : (
                        /* SI PRÊT -> BOUTON PAYER + MODIFIER */
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-4 text-center">
                                <span className="text-sm text-gray-500">Tarif estimé à valider</span>
                                <div className="text-3xl font-extrabold text-green-600 my-1">
                                    {/* Ici vous pourrez mettre le vrai prix retourné par l'API plus tard */}
                                    --,-- €
                                </div>
                                <p className="text-xs text-gray-400">Prix calculé à l'étape suivante</p>
                            </div>

                            <button
                                onClick={handlePayment}
                                disabled={loading}
                                className="w-full py-4 rounded-xl bg-green-600 text-white font-bold text-lg shadow-lg hover:bg-green-700 hover:shadow-green-200 transition-all flex items-center justify-center mb-3"
                            >
                                {loading ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle className="mr-2"/>}
                                Payer et Souscrire
                            </button>

                            <button
                                onClick={() => setIsQuoteReady(false)}
                                className="w-full py-2 rounded-lg text-gray-500 hover:bg-gray-100 text-sm font-medium flex items-center justify-center transition-colors"
                            >
                                <Edit3 className="w-3 h-3 mr-2"/> Modifier ma demande
                            </button>
                        </div>
                    )}
                </div>

                {/* Lien légal */}
                {currentIpid && (
                    <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                        <a href={currentIpid.href} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:text-purple-600 underline">
                            Voir les conditions (IPID)
                        </a>
                    </div>
                )}

              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
