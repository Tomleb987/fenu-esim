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
  Edit3,
} from "lucide-react";

// --- TYPES ---
type Companion = {
  firstName: string;
  lastName: string;
  birthDate: string;
};

// --- LIENS IPID (Documents légaux) ---
// Assurez-vous que ces PDF existent dans public/docs/ava/
const IPID_BY_PRODUCT: Record<string, { label: string; href: string }> = {
  ava_tourist_card: { label: "IPID – Tourist Card", href: "/docs/ava/FP-AVA-TOURIST-CARD.pdf" },
  ava_carte_sante: { label: "IPID – Carte Santé", href: "/docs/ava/FP-AVA-CARTE-SANTE.pdf" },
  plan_sante_working_holiday_pvt: { label: "IPID – Plan Santé PVT", href: "/docs/ava/FP-PLAN-SANTE-PVT.pdf" },
  plan_sante_diginomad: { label: "IPID – DigiNomad", href: "/docs/ava/FP-PLAN-SANTE-DIGINOMAD.pdf" },
};

export default function AssurancePage() {
  // --- ETATS (STATE) ---
  const [loading, setLoading] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(true); // Modale au chargement
  const [isQuoteReady, setIsQuoteReady] = useState(false); // Est-ce que le devis est calculé ?
  const [apiPrice, setApiPrice] = useState<string | null>(null); // Prix renvoyé par AVA

  // Données Formulaire
  const [productType, setProductType] = useState("ava_tourist_card");
  const [dates, setDates] = useState({ start: "", end: "" });
  const [subscriber, setSubscriber] = useState({
    firstName: "",
    lastName: "",
    email: "",
    birthDate: "",
    countryCode: "PF", // Par défaut Polynésie
    address: { street: "", zip: "", city: "" },
  });
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [tripCostPerPerson, setTripCostPerPerson] = useState<number | "">("");

  // --- CALCULS LOCAUX ---
  const totalTravelers = 1 + companions.length;
  const totalTripCost = tripCostPerPerson === "" ? 0 : tripCostPerPerson * totalTravelers;

  // --- DONNÉES DYNAMIQUES ---
  const currentOptionsList = getOptionsForProduct(productType);
  const currentProductInfo = AVA_PRODUCTS.find((p) => p.id === productType);
  const currentIpid = IPID_BY_PRODUCT[productType];

  // Reset quand on change de produit
  useEffect(() => {
    setSelectedOptions({});
    setIsQuoteReady(false);
    setApiPrice(null);
  }, [productType]);

  // --- UTILITAIRES ---
  const formatDateFR = (val: string) => {
    if (!val) return "--";
    try {
      return new Date(val).toLocaleDateString("fr-FR");
    } catch {
      return val;
    }
  };

  // --- HANDLERS (FONCTIONS) ---

  const handleOptionChange = (optionId: string, subOptionId: string | null) => {
    const newOptions = { ...selectedOptions };
    if (subOptionId === null) delete newOptions[optionId];
    else newOptions[optionId] = subOptionId;
    setSelectedOptions(newOptions);
  };

  const addCompanion = () => {
    setCompanions((prev) => [...prev, { firstName: "", lastName: "", birthDate: "" }]);
  };

  const updateCompanion = (index: number, field: keyof Companion, value: string) => {
    setCompanions((prev) => {
      const c = [...prev];
      c[index] = { ...c[index], [field]: value };
      return c;
    });
  };

  const removeCompanion = (index: number) => {
    setCompanions((prev) => prev.filter((_, i) => i !== index));
  };

  // --- ACTION 1 : OBTENIR LE TARIF (Appel API get-quote) ---
  const handleCalculateQuote = async () => {
    // 1. Validation basique
    if (!dates.start || !dates.end) {
      alert("Veuillez sélectionner les dates de votre voyage.");
      return;
    }
    if (!subscriber.lastName || !subscriber.firstName || !subscriber.email) {
      alert("Veuillez remplir vos informations personnelles.");
      return;
    }
    if (tripCostPerPerson === "") {
      alert("Veuillez indiquer le coût du voyage (mettez 0 si inconnu).");
      return;
    }

    setLoading(true);

    try {
      // 2. Préparation des options pour l'API
      const formattedOptions: Record<string, Record<string, string>> = {};
      Object.entries(selectedOptions).forEach(([optId, subOptId]) => {
        const map: Record<string, string> = {};
        // On applique l'option à l'assuré principal ("0") et aux compagnons si besoin
        // Pour l'instant, on simplifie en appliquant à "0" (AVA gère souvent le global via le tarif)
        for (let i = 0; i < totalTravelers; i++) {
            map[i.toString()] = subOptId;
        }
        formattedOptions[optId] = map;
      });

      // 3. Appel API
      const res = await fetch("/api/get-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteData: {
            productType,
            startDate: dates.start,
            endDate: dates.end,
            destinationRegion: 102, // 102 = Monde
            tripCost: totalTripCost, // Montant TOTAL
            subscriber,
            companions,
            options: formattedOptions,
          },
        }),
      });

      const data = await res.json();

      if (res.ok && (data.price !== undefined)) {
        setApiPrice(data.price);
        setIsQuoteReady(true); // Le devis est prêt, on affiche le bouton Payer
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        alert("Erreur AVA : " + (data.error || "Impossible de calculer le tarif. Vérifiez les dates."));
      }
    } catch (err) {
      console.error(err);
      alert("Erreur technique lors de la connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  // --- ACTION 2 : PAYER (Appel API insurance-checkout) ---
  const handlePayment = async () => {
    setLoading(true);
    try {
      // On reconstruit les options
      const formattedOptions: Record<string, Record<string, string>> = {};
      Object.entries(selectedOptions).forEach(([optId, subOptId]) => {
        const map: Record<string, string> = {};
        for (let i = 0; i < totalTravelers; i++) map[i.toString()] = subOptId;
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
        // Redirection vers Stripe
        window.location.href = data.url;
      } else {
        alert("Erreur Paiement : " + (data.error || "Impossible d'initialiser Stripe"));
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors du paiement.");
    } finally {
      setLoading(false);
    }
  };

  // --- COMPOSANT MODALE (Popup au démarrage) ---
  const OfferSelectionModal = () => {
    if (!offerModalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-4xl p-6 rounded-3xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold text-center text-purple-900 mb-2">
            Quel est votre projet de voyage ?
          </h2>
          <p className="text-gray-500 text-center mb-8">
            Sélectionnez l&apos;offre adaptée pour commencer votre devis.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVA_PRODUCTS.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  setProductType(product.id);
                  setOfferModalOpen(false);
                }}
                className="text-left p-4 rounded-2xl border-2 border-gray-100 hover:border-purple-500 hover:bg-purple-50 transition-all flex gap-4 items-start group"
              >
                <div className="text-4xl group-hover:scale-110 transition-transform">
                  {product.icon}
                </div>
                <div>
                  <div className="font-bold text-gray-900">{product.title}</div>
                  <div className="text-xs text-purple-700 font-semibold uppercase mt-1">
                    {product.subtitle}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {product.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setOfferModalOpen(false)}
            className="block mt-6 mx-auto text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Fermer et choisir plus tard
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Assurance Voyage | Fenuasim</title>
        <meta name="description" content="Souscrivez votre assurance voyage en ligne." />
      </Head>

      <OfferSelectionModal />

      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-7xl mx-auto">
          
          {/* HEADER */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Voyagez l&apos;esprit tranquille 🛡️
            </h1>
            <p className="text-gray-500 mt-2">
              Assurance médicale, rapatriement et bagages. Souscription immédiate.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* --- COLONNE GAUCHE : FORMULAIRE --- */}
            <div className={`lg:col-span-2 space-y-6 transition-all duration-500 ${isQuoteReady ? "opacity-60 pointer-events-none grayscale-[0.5]" : ""}`}>
              
              {/* 1. CHOIX PRODUIT */}
              <section className="mb-8">
                <h2 className="flex items-center text-lg font-bold text-gray-800 mb-4">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">1</span>
                  Votre formule
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {AVA_PRODUCTS.map((product) => {
                    const isSelected = productType === product.id;
                    return (
                      <div
                        key={product.id}
                        onClick={() => !isQuoteReady && setProductType(product.id)}
                        className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all flex flex-col h-full ${
                          isSelected
                            ? "border-purple-600 bg-white shadow-md ring-1 ring-purple-600"
                            : "border-gray-200 bg-white hover:border-purple-300"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">
                            CHOISI
                          </div>
                        )}
                        <div className="text-3xl mb-2">{product.icon}</div>
                        <div className="font-bold text-gray-900">{product.title}</div>
                        <div className="text-xs text-purple-700 font-semibold uppercase">{product.subtitle}</div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 2. DATES & COÛT */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h2 className="flex items-center text-lg font-bold text-gray-800 mb-4">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">2</span>
                  Détails du voyage
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Départ</label>
                    <input
                      type="date"
                      required
                      className="w-full p-3 border rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                      onChange={(e) => setDates({ ...dates, start: e.target.value })}
                      disabled={isQuoteReady}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Retour</label>
                    <input
                      type="date"
                      required
                      className="w-full p-3 border rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                      onChange={(e) => setDates({ ...dates, end: e.target.value })}
                      disabled={isQuoteReady}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Coût / Pers. (€)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="100"
                      placeholder="Ex: 2000"
                      className="w-full p-3 border rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                      value={tripCostPerPerson}
                      onChange={(e) => setTripCostPerPerson(e.target.value === "" ? "" : Number(e.target.value))}
                      disabled={isQuoteReady}
                    />
                  </div>
                </div>
              </section>

              {/* 3. ASSURÉ */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h2 className="flex items-center text-lg font-bold text-gray-800 mb-4">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">3</span>
                  Vos informations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    placeholder="Prénom"
                    required
                    className="p-3 border rounded-lg text-gray-900"
                    onChange={(e) => setSubscriber({ ...subscriber, firstName: e.target.value })}
                    disabled={isQuoteReady}
                  />
                  <input
                    placeholder="Nom"
                    required
                    className="p-3 border rounded-lg text-gray-900"
                    onChange={(e) => setSubscriber({ ...subscriber, lastName: e.target.value })}
                    disabled={isQuoteReady}
                  />
                  <input
                    type="date"
                    required
                    className="p-3 border rounded-lg text-gray-900"
                    onChange={(e) => setSubscriber({ ...subscriber, birthDate: e.target.value })}
                    disabled={isQuoteReady}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    className="p-3 border rounded-lg text-gray-900"
                    onChange={(e) => setSubscriber({ ...subscriber, email: e.target.value })}
                    disabled={isQuoteReady}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    className="p-3 border rounded-lg bg-white text-gray-900"
                    value={subscriber.countryCode}
                    onChange={(e) => setSubscriber({ ...subscriber, countryCode: e.target.value })}
                    disabled={isQuoteReady}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Adresse complète"
                    required
                    className="p-3 border rounded-lg text-gray-900"
                    onChange={(e) => setSubscriber({ ...subscriber, address: { ...subscriber.address, street: e.target.value } })}
                    disabled={isQuoteReady}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Code Postal"
                      required
                      className="p-3 border rounded-lg text-gray-900"
                      onChange={(e) => setSubscriber({ ...subscriber, address: { ...subscriber.address, zip: e.target.value } })}
                      disabled={isQuoteReady}
                    />
                    <input
                      placeholder="Ville"
                      required
                      className="p-3 border rounded-lg text-gray-900"
                      onChange={(e) => setSubscriber({ ...subscriber, address: { ...subscriber.address, city: e.target.value } })}
                      disabled={isQuoteReady}
                    />
                  </div>
                </div>
              </section>

              {/* 4. OPTIONS & VOYAGEURS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* VOYAGEURS SUP */}
                <div className="bg-white p-5 rounded-xl border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-700 flex items-center">
                      <User className="w-4 h-4 mr-2" /> Voyageurs
                    </h3>
                    <button
                      type="button"
                      onClick={addCompanion}
                      disabled={isQuoteReady}
                      className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 disabled:opacity-50"
                    >
                      + Ajouter
                    </button>
                  </div>
                  {companions.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Solo</p>
                  ) : (
                    <div className="space-y-2">
                      {companions.map((c, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            placeholder="Prénom"
                            className="w-full p-2 border rounded text-sm text-gray-900"
                            onChange={(e) => updateCompanion(i, "firstName", e.target.value)}
                            disabled={isQuoteReady}
                          />
                          <input
                            placeholder="Nom"
                            className="w-full p-2 border rounded text-sm text-gray-900"
                            onChange={(e) => updateCompanion(i, "lastName", e.target.value)}
                            disabled={isQuoteReady}
                          />
                          <button
                            type="button"
                            onClick={() => removeCompanion(i)}
                            disabled={isQuoteReady}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* OPTIONS */}
                {currentOptionsList.length > 0 && (
                  <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                    <h3 className="font-bold text-indigo-900 mb-4 flex items-center">
                      <ShieldCheck className="w-4 h-4 mr-2" /> Options
                    </h3>
                    <div className="space-y-3">
                      {currentOptionsList.map((opt) => (
                        <div
                          key={opt.id}
                          className="flex items-center justify-between bg-white p-2 rounded border border-indigo-50"
                        >
                          <label className="text-sm text-gray-700 flex-1 cursor-pointer select-none flex items-center">
                            {opt.type === "boolean" && (
                              <input
                                type="checkbox"
                                className="mr-2 h-4 w-4 text-purple-600"
                                checked={!!selectedOptions[opt.id]}
                                onChange={(e) =>
                                  handleOptionChange(
                                    opt.id,
                                    e.target.checked ? opt.defaultSubOptionId || opt.id : null
                                  )
                                }
                                disabled={isQuoteReady}
                              />
                            )}
                            {opt.label}
                          </label>
                          {opt.type === "select" && (
                            <select
                              className="text-xs border rounded p-1 max-w-[120px] text-gray-900"
                              value={selectedOptions[opt.id] || ""}
                              onChange={(e) =>
                                handleOptionChange(opt.id, e.target.value || null)
                              }
                              disabled={isQuoteReady}
                            >
                              <option value="">--</option>
                              {opt.subOptions?.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* --- COLONNE DROITE : RÉSUMÉ STICKY --- */}
            <div className="lg:col-span-1">
              <div
                className={`bg-white p-6 rounded-2xl shadow-xl border transition-all duration-500 sticky top-6 ${
                  isQuoteReady
                    ? "border-green-500 ring-2 ring-green-100 transform scale-105 z-10"
                    : "border-gray-100"
                }`}
              >
                {/* En-tête carte */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                  <div className="text-4xl bg-purple-50 w-16 h-16 flex items-center justify-center rounded-2xl shadow-inner">
                    {currentProductInfo?.icon}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg leading-tight">
                      {currentProductInfo?.title}
                    </div>
                    <div className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded mt-1 inline-block">
                      {currentProductInfo?.subtitle}
                    </div>
                  </div>
                </div>

                {/* Détails */}
                <div className="space-y-3 text-sm mb-8">
                  <div className="flex justify-between py-2 border-b border-dashed border-gray-100">
                    <span className="text-gray-500 flex items-center">
                      <User className="w-4 h-4 mr-2" /> Voyageurs
                    </span>
                    <span className="font-medium text-gray-900">
                      {totalTravelers} pers.
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-dashed border-gray-100">
                    <span className="text-gray-500 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" /> Durée
                    </span>
                    <span className="font-medium text-gray-900 text-right">
                      {dates.start ? formatDateFR(dates.start) : "--"} <br /> au{" "}
                      {dates.end ? formatDateFR(dates.end) : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500 flex items-center">
                      <ShieldCheck className="w-4 h-4 mr-2" /> Options
                    </span>
                    <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {Object.keys(selectedOptions).length} ajoutées
                    </span>
                  </div>
                </div>

                {/* ZONE PRIX & BOUTONS */}
                <div className="space-y-4">
                  {/* ETAT 1 : CALCUL DU DEVIS */}
                  {!isQuoteReady ? (
                    <button
                      type="button"
                      onClick={handleCalculateQuote}
                      disabled={loading}
                      className="w-full py-4 rounded-xl bg-purple-600 text-white font-bold text-lg shadow-lg hover:bg-purple-700 transition-all flex items-center justify-center"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin mr-2" />
                      ) : (
                        <Calculator className="mr-2 h-5 w-5" />
                      )}
                      Obtenir mon tarif
                    </button>
                  ) : (
                    /* ETAT 2 : PAIEMENT */
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="mb-4 text-center bg-green-50 p-4 rounded-xl border border-green-100">
                        <span className="text-sm text-gray-500 block mb-1">
                          Tarif total à payer
                        </span>
                        <div className="text-4xl font-extrabold text-green-600">
                          {apiPrice ? `${apiPrice} €` : "--"}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Toutes taxes comprises
                        </p>
                      </div>

                      <button
                        onClick={handlePayment}
                        disabled={loading}
                        className="w-full py-4 rounded-xl bg-green-600 text-white font-bold text-lg shadow-lg hover:bg-green-700 hover:shadow-green-200 transition-all flex items-center justify-center mb-3"
                      >
                        {loading ? (
                          <Loader2 className="animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="mr-2" />
                        )}
                        Payer et Souscrire
                      </button>

                      <button
                        onClick={() => setIsQuoteReady(false)}
                        className="w-full py-2 rounded-lg text-gray-500 hover:bg-gray-100 text-sm font-medium flex items-center justify-center transition-colors"
                      >
                        <Edit3 className="w-3 h-3 mr-2" /> Modifier ma demande
                      </button>
                    </div>
                  )}
                </div>

                {/* Lien légal */}
                {currentIpid && (
                  <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                    <a
                      href={currentIpid.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-purple-400 hover:text-purple-600 underline flex items-center justify-center"
                    >
                      <FileText className="w-3 h-3 mr-1" /> Conditions Générales
                      (IPID)
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
