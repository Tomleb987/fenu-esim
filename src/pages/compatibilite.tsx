"use client";

import { useState } from "react";

/* -------------------------------------------------
   📌 LISTE LOCALE DES TERMINAUX COMPATIBLES eSIM
--------------------------------------------------*/
interface Device {
  brand: string;
  models: string[];
}

const TERMINAUX_ESIM: Device[] = [
  {
    brand: "Apple",
    models: [
      "iPhone 16",
      "iPhone 16 Plus",
      "iPhone 16 Pro",
      "iPhone 16 Pro Max",
      "iPhone 16e",
      "iPhone 15",
      "iPhone 15 Plus",
      "iPhone 15 Pro",
      "iPhone 15 Pro Max",
      "iPhone 14",
      "iPhone 14 Plus",
      "iPhone 14 Pro",
      "iPhone 14 Pro Max",
      "iPhone 13",
      "iPhone 13 Mini",
      "iPhone 13 Pro",
      "iPhone 13 Pro Max",
      "iPhone 12",
      "iPhone 12 Mini",
      "iPhone 12 Pro",
      "iPhone 12 Pro Max",
      "iPhone 11",
      "iPhone 11 Pro",
      "iPhone 11 Pro Max",
      "iPhone XS",
      "iPhone XS Max",
      "iPhone XR",
      "iPhone SE (2020)",
      "iPhone SE (2022)",
      "iPad (7e génération et +)",
      "iPad Air (3e génération et +)",
      "iPad Pro 11”",
      "iPad Pro 12.9”",
      "iPad Mini (5e génération et +)",
    ],
  },

  {
    brand: "Samsung",
    models: [
      "Galaxy S24",
      "Galaxy S24+",
      "Galaxy S24 Ultra",
      "Galaxy S24 FE",
      "Galaxy S23",
      "Galaxy S23+",
      "Galaxy S23 Ultra",
      "Galaxy S23 FE",
      "Galaxy S22",
      "Galaxy S22+",
      "Galaxy S22 Ultra",
      "Galaxy S21",
      "Galaxy S21+",
      "Galaxy S21 Ultra",
      "Galaxy S20",
      "Galaxy S20+",
      "Galaxy S20 Ultra",
      "Galaxy Note 20",
      "Galaxy Note 20 Ultra",
      "Galaxy Z Fold",
      "Galaxy Z Fold 2",
      "Galaxy Z Fold 3",
      "Galaxy Z Fold 4",
      "Galaxy Z Fold 5",
      "Galaxy Z Fold 6",
      "Galaxy Z Flip",
      "Galaxy Z Flip 3",
      "Galaxy Z Flip 4",
      "Galaxy Z Flip 5",
      "Galaxy Z Flip 6",
      "Galaxy A23 5G",
      "Galaxy A35 5G",
      "Galaxy A36",
      "Galaxy A54 5G",
      "Galaxy A55 5G",
      "Galaxy A56",
      "Galaxy XCover7 Pro",
      "Galaxy Watch4",
      "Galaxy Watch5",
      "Galaxy Watch6",
    ],
  },

  {
    brand: "Google",
    models: [
      "Pixel 9",
      "Pixel 9a",
      "Pixel 9 Pro",
      "Pixel 9 Pro XL",
      "Pixel 9 Pro Fold",
      "Pixel 8",
      "Pixel 8a",
      "Pixel 8 Pro",
      "Pixel 7",
      "Pixel 7a",
      "Pixel 7 Pro",
      "Pixel 6",
      "Pixel 6a",
      "Pixel 6 Pro",
      "Pixel 5",
      "Pixel 5a",
      "Pixel 4",
      "Pixel 4 XL",
      "Pixel 4a",
      "Pixel 4a 5G",
      "Pixel Fold",
    ],
  },

  {
    brand: "Oppo",
    models: [
      "Find X3 Pro",
      "Find X5",
      "Find X5 Pro",
      "Find X8",
      "Find X8 Pro",
      "Find N2 Flip",
      "Find N5",
      "Reno6 Pro 5G",
      "Reno5 A",
      "Reno14",
      "Reno14 Pro",
      "Oppo Watch",
      "Watch X2 Mini",
    ],
  },

  {
    brand: "Huawei",
    models: ["P40", "P40 Pro", "Mate 40 Pro", "Watch 3", "Watch 3 Pro"],
  },

  {
    brand: "Xiaomi",
    models: [
      "Xiaomi 12T Pro",
      "Xiaomi 13",
      "Xiaomi 13 Pro",
      "Xiaomi 13T",
      "Xiaomi 13T Pro",
      "Xiaomi 13 Lite",
      "Xiaomi 14",
      "Xiaomi 14 Pro",
      "Xiaomi 14T",
      "Xiaomi 14T Pro",
      "Xiaomi 15",
      "Xiaomi 15 Ultra",
      "Poco X7",
    ],
  },

  {
    brand: "Redmi",
    models: [
      "Redmi Note 14 Pro",
      "Redmi Note 14 Pro 5G",
      "Redmi Note 14 Pro+",
      "Redmi Note 14 Pro+ 5G",
      "Redmi Note 13 Pro",
      "Redmi Note 13 Pro+",
      "Redmi Note 11 Pro 5G",
    ],
  },

  {
    brand: "Autres",
    models: [
      "Fairphone 4",
      "Fairphone 5",
      "Nothing Phone (3a) Pro",
      "Nuu Mobile X5",
      "Realme 14 Pro+",
      "ASUS Zenfone 12 Ultra",
      "ZTE nubia Flip2",
      "Alcatel V3 Ultra",
      "Surface Duo",
      "Surface Duo 2",
      "Surface Pro 9",
      "Surface Go 3",
      "Surface Pro X",
      "Gemini PDA 4G+Wi-Fi",
    ],
  },
];

/* -------------------------------------------------
   ✔️  LOGIQUE → Recherche LOCALE uniquement
--------------------------------------------------*/
export default function Compatibilite() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const check = () => {
    const clean = query.trim().toLowerCase();
    if (!clean) return;

    const allModels = TERMINAUX_ESIM.flatMap((d) => d.models);

    const compatible = allModels.some((m) =>
      m.toLowerCase().includes(clean)
    );

    setResult(
      compatible ? "✅ Compatible eSIM" : "❌ Non compatible eSIM"
    );
  };

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <h1 className="text-3xl font-bold mb-6">Compatibilité eSIM</h1>

      <div className="bg-white p-6 rounded-xl shadow-md border mb-10">
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
          Vérifier
        </button>

        {result && <p className="mt-4 text-xl font-semibold">{result}</p>}
      </div>

      {/* Liste complète */}
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
