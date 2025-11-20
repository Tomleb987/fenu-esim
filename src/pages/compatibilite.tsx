"use client";

import { useState } from "react";

/* -------------------------------------------------
   📌 LISTE COMPLÈTE DES TERMINAUX COMPATIBLES eSIM
--------------------------------------------------*/

interface Device {
  brand: string;
  models: string[];
}

const TERMINAUX_ESIM: Device[] = [
  // … (inchangé, garde toute ta liste)
];

/* -------------------------------------------------
   ⚙️  API → recherche Airalo en temps réel (corrigée)
--------------------------------------------------*/

export default function Compatibilite() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);

  const check = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setStatus(null);
    setApiResponse(null);

    try {
      // 🔥 APPEL DU BON ENDPOINT
      const res = await fetch(
        "/api/compatible-devices?device=" + encodeURIComponent(query)
      );

      const data = await res.json();

      // 👉 Erreur renvoyée par Airalo (token, endpoint, device introuvable)
      if (data.error) {
        setStatus("❌ Erreur Airalo : modèle introuvable");
        setApiResponse(data);
        setLoading(false);
        return;
      }

      // 👉 La vraie réponse Airalo est dans data.result
      const airaloResult = data.result;

      // ✔️ Interprétation Airalo (selon leur spec)
      const isCompatible =
        airaloResult?.data?.is_esim_supported === true ||
        airaloResult?.is_esim_supported === true;

      setStatus(
        isCompatible ? "✅ Compatible eSIM" : "❌ Non compatible eSIM"
      );

      setApiResponse(airaloResult);
    } catch (e) {
      setStatus("❌ Erreur API interne");
    }

    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <h1 className="text-3xl font-bold mb-6">Compatibilité eSIM</h1>

      {/* PREAMBULE + EID */}
      <p className="mb-4 text-md text-gray-800 font-semibold bg-orange-50 border border-orange-200 px-4 py-3 rounded-lg">
        Vérifiez la compatibilité immédiatement : composez <strong>*#06#</strong>.
        <br />
        ➜ Si un numéro <strong>EID</strong> apparaît → compatible eSIM.
        <br />
        ➜ Si seul l’IMEI apparaît → non compatible.
      </p>

      {/* RECHERCHE */}
      <div className="bg-white p-6 rounded-xl shadow-md border mb-10">
        <h2 className="text-lg font-bold mb-4">Rechercher votre modèle</h2>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex : iPhone 15 Pro Max"
          className="w-full px-4 py-2 border rounded-lg mb-4"
        />

        <button
          onClick={check}
          className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition"
        >
          {loading ? "Vérification…" : "Vérifier"}
        </button>

        {status && (
          <p className="mt-4 text-xl font-semibold">{status}</p>
        )}

        {/* Pour debug Airalo : affichage en petit */}
        {apiResponse && (
          <pre className="mt-4 p-2 text-xs text-left bg-gray-50 rounded">
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        )}
      </div>

      {/* LISTE DES TERMINAUX LOCAUX */}
      <div className="bg-white rounded-xl shadow p-6 border border-purple-100 text-left">
        {TERMINAUX_ESIM.map(({ brand, models }) => (
          <div key={brand} className="mb-6">
            <h2 className="text-lg font-bold text-purple-700 mb-2">{brand}</h2>
            <ul className="flex flex-wrap gap-2">
              {models.map((m) => (
                <li
                  key={m}
                  className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm"
                >
                  {m}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
