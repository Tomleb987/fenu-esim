import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Device {
  brand: string
  models: string[]
}

const TERMINAUX_ESIM: Device[] = [
  {
    brand: 'Apple',
    models: [
      'iPhone',
      'iPhone 16',
      'iPhone 16e',
      'iPhone 16 Plus',
      'iPhone 16 Pro',
      'iPhone 16 Pro Max',
      'iPhone 15',
      'iPhone 15 Plus',
      'iPhone 15 Pro',
      'iPhone 15 Pro Max',
      'iPhone 14',
      'iPhone 14 Plus',
      'iPhone 14 Pro',
      'iPhone 14 Pro Max',
      'iPhone 13',
      'iPhone 13 Mini',
      'iPhone 13 Pro',
      'iPhone 13 Pro Max',
      'iPhone 12',
      'iPhone 12 Mini',
      'iPhone 12 Pro',
      'iPhone 12 Pro Max',
      'iPhone 11',
      'iPhone 11 Pro',
      'iPhone 11 Pro Max',
      'iPhone XS',
      'iPhone XS Max',
      'iPhone XR',
      'iPhone SE (2020 et 2022)',
      'iPad (à partir de la 7e génération)',
      'iPad Air (à partir de la 3e génération)',
      'iPad Pro, 11 pouces (à partir de la 1re génération)',
      'iPad Pro 12,9 pouces (à partir de la 3e génération)',
      'iPad Mini (à partir de la 5e génération)'
    ]
  },
  {
    brand: 'Samsung',
    models: [
      'Galaxy S24',
      'Galaxy S24+',
      'Galaxy S24 Ultra',
      'Galaxy S24 FE',
      'Galaxy S23',
      'Galaxy S23+',
      'Galaxy S23 Ultra',
      'Galaxy S23 FE',
      'Galaxy S22',
      'Galaxy S22+',
      'Galaxy S22 Ultra',
      'Galaxy S21',
      'Galaxy S21+',
      'Galaxy S21 Ultra',
      'Galaxy S20',
      'Galaxy S20+',
      'Galaxy S20 Ultra',
      'Galaxy Note 20',
      'Galaxy Note 20 Ultra',
      'Galaxy Z Fold',
      'Galaxy Z Fold 2 5G',
      'Galaxy Z Fold 3',
      'Galaxy Z Fold 4',
      'Galaxy Z Fold 5',
      'Galaxy Z Fold 6',
      'Galaxy Z Flip',
      'Galaxy Z Flip 3 5G',
      'Galaxy Z Flip 4',
      'Galaxy Z Flip 5',
      'Galaxy Z Flip 6',
      'Galaxy A23 5G',
      'Galaxy A35 5G',
      'Galaxy A36',
      'Galaxy A54 5G',
      'Galaxy A55 5G',
      'Galaxy A56',
      'Galaxy XCover7 Pro',
      'Galaxy Watch4',
      'Galaxy Watch5',
      'Galaxy Watch6'
    ]
  },
  {
    brand: 'Google',
    models: [
      'Pixel 9',
      'Pixel 9a',
      'Pixel 9 Pro',
      'Pixel 9 Pro XL',
      'Pixel 9 Pro Fold',
      'Pixel 8',
      'Pixel 8a',
      'Pixel 8 Pro',
      'Pixel 7',
      'Pixel 7a',
      'Pixel 7 Pro',
      'Pixel 6',
      'Pixel 6a',
      'Pixel 6 Pro',
      'Pixel 5',
      'Pixel 5a',
      'Pixel 5a 5G',
      'Pixel 4',
      'Pixel 4a',
      'Pixel 4a 5G',
      'Pixel 4 XL',
      'Pixel 3',
      'Pixel 3a',
      'Pixel 3 XL',
      'Pixel 3a XL',
      'Pixel 2',
      'Pixel 2 XL',
      'Pixel Fold'
    ]
  },
  {
    brand: 'Oppo',
    models: [
      'Find X3 Pro',
      'Reno6 Pro 5G',
      'Reno5 A',
      'OPPO Watch',
      'Find N2 Flip',
      'Find N5',
      'Find X5',
      'Find X5 Pro',
      'Find X8',
      'Find X8 Pro',
      'Reno14',
      'Reno14 Pro',
      'Watch X2 Mini'
    ]
  },
  {
    brand: 'Huawei',
    models: [
      'P40',
      'P40 Pro',
      'Mate 40 Pro',
      'Watch 3',
      'Watch 3 Pro'
    ]
  },
  {
    brand: 'Xiaomi',
    models: [
      'Xiaomi 12T Pro',
      'Xiaomi 13',
      'Xiaomi 13 Pro',
      'Xiaomi 13T',
      'Xiaomi 13T Pro',
      'Xiaomi 13 Lite',
      'Xiaomi 14',
      'Xiaomi 14 Pro',
      'Xiaomi 14T',
      'Xiaomi 14T Pro',
      'Xiaomi 15',
      'Xiaomi 15 Ultra',
      'Xiaomi Poco X7'
    ]
  },
  {
    brand: 'Redmi',
    models: [
      'Redmi Note 14 Pro',
      'Redmi Note 14 Pro 5G',
      'Redmi Note 14 Pro+',
      'Redmi Note 14 Pro+ 5G',
      'Redmi Note 13 Pro',
      'Redmi Note 13 Pro+',
      'Redmi Note 11 Pro 5G'
    ]
  },
  {
    brand: 'Autres',
    models: [
      'Fairphone 4',
      'Fairphone 5',
      'Nothing Phone (3a) Pro',
      'Nuu Mobile X5',
      'Realme 14 Pro+',
      'ASUS Zenfone 12 Ultra',
      'ZTE nubia Flip2',
      'alcatel V3 Ultra',
      'Surface Duo',
      'Surface Duo 2',
      'Surface Pro 9',
      'Surface Go 3',
      'Surface Pro X',
      'Gemini PDA 4G+Wi-Fi'
    ]
  }
]

export default function Compatibilite() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <h1 className="text-3xl font-bold mb-6">Compatibilité eSIM</h1>

      {/* 🔥 Préambule ajouté */}
      <p className="mb-4 text-md text-gray-800 font-semibold bg-orange-50 border border-orange-200 px-4 py-3 rounded-lg">
        Selon la version ou la région d’achat de votre téléphone, il est possible qu’il ne soit pas compatible eSIM.  
        Pour vérifier rapidement, composez <strong>*#06#</strong> et contrôlez la présence d’un numéro <strong>EID</strong>  
        (si seul l’IMEI apparaît, votre appareil n’est pas compatible eSIM).
      </p>

      <p className="mb-6 text-lg text-gray-700">
        Voici une liste récente de terminaux compatibles* eSIM (non exhaustive, à vérifier selon les opérateurs) :
      </p>

      <div className="bg-white rounded-xl shadow p-6 border border-purple-100 text-left">
        {TERMINAUX_ESIM.map(({ brand, models }) => (
          <div key={brand} className="mb-6">
            <h2 className="text-lg font-bold text-purple-700 mb-2">{brand}</h2>
            <ul className="flex flex-wrap gap-2">
              {models.map(model => (
                <li key={model} className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm">
                  {model}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <a
          href="https://www.airalo.com/help/fr/a-propos-dairalo/NFHQSUXFCZOM/quels-sont-les-appareils-compatibles/D2N6OZSVVM9W?srsltid=AfmBOooqcXE3J-YBy6XInyPUDhOzbKGVQetRsP7CzdoklUSPRNTamkV0"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-purple-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-purple-700 transition mb-4"
        >
          Voir la liste complète
        </a>
      </div>
    </div>
  )
}
