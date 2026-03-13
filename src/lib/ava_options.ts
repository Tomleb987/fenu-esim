// src/lib/ava_options.ts

export interface AvaOption {
  id: string;
  label: string;
  type: 'boolean' | 'select' | 'date-range';
  description?: string;
  subOptions?: { id: string; label: string }[];
  defaultSubOptionId?: string;
}

// =============================================
// OPTIONS AVA TOURIST CARD
// =============================================
export const AVA_TOURIST_OPTIONS: AvaOption[] = [
  {
    id: "335",
    label: "Extension Garantie Annulation",
    type: "boolean",
    description: "Couverture dès l'inscription (Tous motifs)",
    defaultSubOptionId: "338"
  },
  {
    id: "339",
    label: "Augmenter Plafond Annulation",
    type: "select",
    description: "Plafond par assuré (au lieu de 6.000€)",
    subOptions: [
      { id: "340", label: "Plafond 8.000 €" },
      { id: "341", label: "Plafond 10.000 €" },
      { id: "342", label: "Plafond 12.000 €" }
    ]
  },
  {
    id: "343",
    label: "Augmenter Garantie Bagages",
    type: "select",
    description: "Plafond par assuré (au lieu de 1.500€)",
    subOptions: [
      { id: "344", label: "Plafond 2.000 €" },
      { id: "345", label: "Plafond 2.500 €" },
      { id: "346", label: "Plafond 3.000 €" }
    ]
  },
  {
    id: "728",
    label: "Rachat de franchise Véhicule (CDW)",
    type: "date-range",
    description: "Couverture dommages jusqu'à 150.000€ — dates de location requises",
  },
  {
    id: "347",
    label: "Augmenter Capital Accident",
    type: "select",
    description: "Capital décès/invalidité (au lieu de 8.000€)",
    subOptions: [
      { id: "459", label: "Capital 50.000 €" },
      { id: "457", label: "Capital 100.000 €" }
    ]
  },
  {
    id: "828",
    label: "AVA SPORT+",
    type: "boolean",
    description: "Sports extrêmes & Frais de recherche (25k€)",
    defaultSubOptionId: "828"
  },
  {
    id: "990",
    label: "AVA TECH+ (Appareils Nomades)",
    type: "select",
    description: "Vol ou casse (Smartphone, Tablette...)",
    subOptions: [
      { id: "989", label: "Couverture 1.500 €" },
      { id: "988", label: "Couverture 3.000 €" }
    ]
  }
];

// =============================================
// OPTIONS AVA CARTE SANTÉ
// =============================================
export const AVA_CARTE_SANTE_OPTIONS: AvaOption[] = [
  {
    id: "456",
    label: "Individuelle Accident (Décès-Invalidité) 24h/24",
    type: "select",
    description: "Capital en cas de décès ou d'invalidité",
    subOptions: [
      { id: "303", label: "Capital 50.000 €" },
      { id: "301", label: "Capital 100.000 €" },
      { id: "302", label: "Capital 150.000 €" }
    ]
  },
  {
    id: "297",
    label: "AVA SNO+ (Sports d'hiver)",
    type: "boolean",
    description: "Pack sports de neige inclus",
    defaultSubOptionId: "297"
  },
  {
    id: "762",
    label: "AVA SPORT+",
    type: "boolean",
    description: "Sports extrêmes & Frais de recherche (25k€)",
    defaultSubOptionId: "762"
  },
  {
    id: "291",
    label: "Perte, vol ou détérioration de bagages",
    type: "select",
    description: "Plafond par assuré",
    subOptions: [
      { id: "292", label: "Couverture 1.500 €" },
      { id: "293", label: "Couverture 2.000 €" },
      { id: "294", label: "Couverture 2.500 €" }
    ]
  }
];

// =============================================
// OPTIONS AVA AVANTAGES POM
// =============================================
// ⚠️ ID option "garantie voyage" à confirmer avec AVA (Alexandre)
export const AVA_AVANTAGES_POM_OPTIONS: AvaOption[] = [
  {
    id: "POM_VOYAGE", // TODO: remplacer par l'ID réel AVA
    label: "Option Garantie Voyage",
    type: "boolean",
    description: "Extension couverture pour vos voyages (annulation, bagages, assistance)",
  },
];

// =============================================
// HELPER
// =============================================
export function getOptionsForProduct(productType: string): AvaOption[] {
  switch (productType) {
    case "ava_carte_sante":
      return AVA_CARTE_SANTE_OPTIONS;
    case "avantages_pom":
      return AVA_AVANTAGES_POM_OPTIONS;
    case "ava_tourist_card":
    default:
      return AVA_TOURIST_OPTIONS;
  }
}
