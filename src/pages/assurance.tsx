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
} from "lucide-react";

type Companion = {
  firstName: string;
  lastName: string;
  birthDate: string;
};

export default function AssurancePage() {
  // --- ÉTATS (STATE) ---
  const [loading, setLoading] = useState(false);
  const [productType, setProductType] = useState("ava_tourist_card");

  // Dates du voyage
  const [dates, setDates] = useState({ start: "", end: "" });

  // Assuré Principal
  const [subscriber, setSubscriber] = useState({
    firstName: "",
    lastName: "",
    email: "",
    birthDate: "",
    countryCode: "PF", // Par défaut Polynésie
    address: { street: "", zip: "", city: "" },
  });

  // Voyageurs supplémentaires
  const [companions, setCompanions] = useState<Companion[]>([]);

  // Options choisies
  const [selectedOptions, setSelectedOptions] =
    useState<Record<string, string>>({});

  // Estimation tarif (côté UI uniquement — le vrai calcul reste côté backend)
  const [estimatedTravelersCount, setEstimatedTravelersCount] = useState(1);

  // Reset des options quand on change de produit pour éviter les incohérences
  useEffect(() => {
    setSelectedOptions({});
  }, [productType]);

  // Met à jour le nombre total de voyageurs
  useEffect(() => {
    setEstimatedTravelersCount(1 + companions.length);
  }, [companions.length]);

  // Récupération des données dynamiques
  const currentOptionsList = getOptionsForProduct(productType);
  const currentProductInfo = AVA_PRODUCTS.find((p) => p.id === productType);

  // --- FORMATAGE DATE POUR LE RÉSUMÉ ---
  const formatDate = (value: string) => {
    if (!value) return "--";
    try {
      return new Date(value).toLocaleDateString("fr-FR");
    } catch {
      return value;
    }
  };

  // --- GESTIONNAIRE DES OPTIONS ---
  const handleOptionChange = (optionId: string, subOptionId: string | null) => {
    const newOptions = { ...selectedOptions };
    if (subOptionId === null) {
      delete newOptions[optionId];
    } else {
      newOptions[optionId] = subOptionId;
    }
    setSelectedOptions(newOptions);
  };

  // --- GESTION DES VOYAGEURS SUPPLÉMENTAIRES ---
  const addCompanion = () => {
    setCompanions((prev) => [
      ...prev,
      { firstName: "", lastName: "", birthDate: "" },
    ]);
  };

  const updateCompanion = (index: number, field: keyof Companion, value: string) => {
    setCompanions((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [field]: value };
      return clone;
    });
  };

  const removeCompanion = (index: number) => {
    setCompanions((prev) => prev.filter((_, i) => i !== index));
  };

  // --- DÉCLENCHEMENT DU PAIEMENT ---
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. On prépare les options au format complexe attendu par AVA
      // Structure : { "ID_OPTION": { "0": "VALEUR_SOUS_OPTION" } }
      // "0" correspond à l'index de l'assuré principal
      const formattedOptions: Record<string, Record<string, string>> = {};

      Object.entries(selectedOptions).forEach(([optId, subOptId]) => {
        const map: Record<string, string> = {};
        map["0"] = subOptId;
        formattedOptions[optId] = map;
      });

      // 2. Appel à votre API "Backend"
      const res = await fetch("/api/insurance-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteData: {
            productType,
            startDate: dates.start,
            endDate: dates.end,
            destinationRegion: 102, // 102 = Monde entier (par défaut)
            tripCost: 2000, // Valeur par défaut (ou à demander dans le formulaire)
            subscriber,
            companions, // ✅ on envoie maintenant les voyageurs supplémentaires
            options: formattedOptions,
          },
          userEmail: subscriber.email,
        }),
      });

      const data = await res.json();

      if (data.url) {
        // 3. Redirection vers Stripe
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

  return (
    <>
      <Head>
        <title>Assurance Voyage AVA | Fenuasim</title>
        <meta
          name="description"
          content="Souscrivez votre assurance voyage en ligne. Couverture immédiate."
        />
      </Head>

      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-7xl mx-auto">
          {/* --- HEADER --- */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Voyagez l&apos;esprit tranquille 🛡️
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Assurance médicale, rapatriement et bagages. Souscription immédiate
              en 2 minutes.
            </p>
          </div>

          <form
            onSubmit={handlePayment}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* --- COLONNE GAUCHE : LE FORMULAIRE --- */}
            <div className="lg:col-span-2 space-y-8">
              {/* 1. CHOIX DU PRODUIT (GRILLE) */}
              <section>
                <h2 className="flex items-center text-xl font-bold text-gray-800 mb-4">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                    1
                  </span>
                  Choisissez votre formule
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {AVA_PRODUCTS.map((product) => {
                    const isSelected = productType === product.id;
                    return (
                      <div
                        key={product.id}
                        onClick={() => setProductType(product.id)}
                        className={`
                          relative cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200
                          flex flex-col h-full group
                          ${
                            isSelected
                              ? "border-blue-600 bg-white shadow-lg ring-1 ring-blue-600 scale-[1.01]"
                              : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                          }
                        `}
                      >
                        {isSelected && (
                          <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl shadow-sm">
                            CHOISI
                          </div>
                        )}
                        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">
                          {product.icon}
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">
                          {product.title}
                        </h3>
                        <p className="text-xs font-semibold text-blue-600 uppercase mb-2 tracking-wide">
                          {product.subtitle}
                        </p>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          {product.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 2. DATES DU VOYAGE */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
                <h2 className="flex items-center text-xl font-bold text-gray-800 mb-6">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                    2
                  </span>
                  Dates du voyage
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de départ
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="date"
                        required
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-purple-900"
                        onChange={(e) =>
                          setDates({ ...dates, start: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de retour
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="date"
                        required
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-purple-900"
                        onChange={(e) =>
                          setDates({ ...dates, end: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. INFOS PERSONNELLES */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
                <h2 className="flex items-center text-xl font-bold text-gray-800 mb-6">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                    3
                  </span>
                  Assuré Principal
                </h2>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-purple-900"
                        onChange={(e) =>
                          setSubscriber({
                            ...subscriber,
                            firstName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-purple-900"
                        onChange={(e) =>
                          setSubscriber({
                            ...subscriber,
                            lastName: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date de naissance
                      </label>
                      <input
                        type="date"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-purple-900"
                        onChange={(e) =>
                          setSubscriber({
                            ...subscriber,
                            birthDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="Pour recevoir le contrat"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-purple-900"
                        onChange={(e) =>
                          setSubscriber({
                            ...subscriber,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pays de résidence
                    </label>
                    <select
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 mb-4 outline-none transition-colors text-purple-900"
                      value={subscriber.countryCode}
                      onChange={(e) =>
                        setSubscriber({
                          ...subscriber,
                          countryCode: e.target.value,
                        })
                      }
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <input
                        placeholder="Adresse (Rue)"
                        required
                        className="sm:col-span-3 w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none text-purple-900"
                        onChange={(e) =>
                          setSubscriber({
                            ...subscriber,
                            address: {
                              ...subscriber.address,
                              street: e.target.value,
                            },
                          })
                        }
                      />
                      <input
                        placeholder="Code Postal"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none text-purple-900"
                        onChange={(e) =>
                          setSubscriber({
                            ...subscriber,
                            address: {
                              ...subscriber.address,
                              zip: e.target.value,
                            },
                          })
                        }
                      />
                      <input
                        placeholder="Ville"
                        required
                        className="sm:col-span-2 w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none text-purple-900"
                        onChange={(e) =>
                          setSubscriber({
                            ...subscriber,
                            address: {
                              ...subscriber.address,
                              city: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* 3.bis VOYAGEURS SUPPLÉMENTAIRES */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="flex items-center text-lg font-bold text-gray-800">
                    <User className="w-5 h-5 mr-2" />
                    Voyageurs supplémentaires
                  </h2>
                  <button
                    type="button"
                    onClick={addCompanion}
                    className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter un voyageur
                  </button>
                </div>

                {companions.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Aucun autre voyageur pour le moment. Ajoutez-en si vous voyagez
                    à plusieurs.
                  </p>
                )}

                <div className="space-y-4 mt-4">
                  {companions.map((companion, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700">
                          Voyageur #{index + 2}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeCompanion(index)}
                          className="text-xs text-red-500 hover:text-red-600 inline-flex items-center"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Retirer
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <input
                          placeholder="Prénom"
                          required
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none text-purple-900"
                          value={companion.firstName}
                          onChange={(e) =>
                            updateCompanion(index, "firstName", e.target.value)
                          }
                        />
                        <input
                          placeholder="Nom"
                          required
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none text-purple-900"
                          value={companion.lastName}
                          onChange={(e) =>
                            updateCompanion(index, "lastName", e.target.value)
                          }
                        />
                        <input
                          type="date"
                          required
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none text-purple-900"
                          value={companion.birthDate}
                          onChange={(e) =>
                            updateCompanion(index, "birthDate", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 4. OPTIONS DYNAMIQUES */}
              {currentOptionsList.length > 0 && (
                <section className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 transition-all">
                  <h3 className="flex items-center text-lg font-bold text-indigo-900 mb-4">
                    <ShieldCheck className="w-5 h-5 mr-2" /> Options disponibles
                  </h3>
                  <div className="space-y-3">
                    {currentOptionsList.map((opt) => (
                      <div
                        key={opt.id}
                        className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-center">
                          {opt.type === "boolean" && (
                            <input
                              type="checkbox"
                              id={`opt-${opt.id}`}
                              className="w-5 h-5 mr-3 text-blue-600 rounded focus:ring-blue-500 border-gray-300 cursor-pointer"
                              checked={!!selectedOptions[opt.id]}
                              onChange={(e) =>
                                handleOptionChange(
                                  opt.id,
                                  e.target.checked
                                    ? opt.defaultSubOptionId || opt.id
                                    : null
                                )
                              }
                            />
                          )}
                          <label
                            htmlFor={`opt-${opt.id}`}
                            className="font-medium text-gray-700 cursor-pointer select-none"
                          >
                            {opt.label}
                          </label>
                        </div>
                        {opt.type === "select" && (
                          <select
                            className="p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer text-purple-900"
                            value={selectedOptions[opt.id] || ""}
                            onChange={(e) =>
                              handleOptionChange(
                                opt.id,
                                e.target.value === "" ? null : e.target.value
                              )
                            }
                          >
                            <option value="">-- Non inclus --</option>
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
                </section>
              )}
            </div>

            {/* --- COLONNE DROITE : RÉSUMÉ STICKY --- */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 sticky top-6 transition-all duration-300">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">
                  Votre commande
                </h3>

                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                  <div className="text-4xl bg-blue-50 w-16 h-16 flex items-center justify-center rounded-2xl shadow-inner">
                    {currentProductInfo?.icon}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg leading-tight">
                      {currentProductInfo?.title}
                    </div>
                    <div className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded mt-1 inline-block">
                      {currentProductInfo?.subtitle}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm mb-8">
                  <div className="flex justify-between py-2 border-b border-dashed border-gray-100">
                    <span className="text-gray-500 flex items-center">
                      <User className="w-4 h-4 mr-2" /> Voyageurs
                    </span>
                    <span className="font-medium text-gray-900">
                      {estimatedTravelersCount}{" "}
                      {estimatedTravelersCount > 1 ? "personnes" : "personne"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-dashed border-gray-100">
                    <span className="text-gray-500 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" /> Durée
                    </span>
                    <span className="font-medium text-gray-900">
                      {dates.start && dates.end
                        ? `${formatDate(dates.start)} → ${formatDate(
                            dates.end
                          )}`
                        : "--"}
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

                  {/* Info tarif */}
                  <div className="pt-3 mt-2 border-t border-gray-100 text-xs text-gray-500">
                    Le tarif exact sera calculé automatiquement selon vos
                    informations et options, à l&apos;étape suivante (paiement
                    sécurisé Stripe).
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`
                    w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg transition-all flex items-center justify-center
                    ${
                      loading
                        ? "bg-gray-400 cursor-wait opacity-70"
                        : "bg-green-600 hover:bg-green-700 hover:shadow-green-200 hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-5 w-5" />
                      Initialisation...
                    </>
                  ) : (
                    <>
                      Payer et Souscrire <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <CheckCircle className="w-3 h-3 text-green-500" /> Paiement
                  sécurisé Stripe
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
