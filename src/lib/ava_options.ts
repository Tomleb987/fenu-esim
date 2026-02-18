// src/lib/ava_options.ts

export interface AvaOption {
  id: string; // L'ID "Parent" (ex: 335 pour Annulation)
  label: string;
  type: 'boolean' | 'select' | 'date-range'; // date-range = option avec from/to dates (ex: CDW 728)
  description?: string;
  subOptions?: { id: string; label: string }[];
  defaultSubOptionId?: string; // L'ID "Enfant" par défaut si c'est un boolean (ex: 338)
}

export const AVA_TOURIST_OPTIONS: AvaOption[] = [
  // --- ANNULATION ---
  { 
    id: "335", 
    label: "Extension Garantie Annulation", 
    type: "boolean", 
    description: "Couverture dès l'inscription (Tous motifs)",
    defaultSubOptionId: "338" // ID technique envoyé
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

  // --- BAGAGES ---
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

  // --- VÉHICULE ---
  // Option 728 : type "date-range" — AVA attend from_date_option / to_date_option (pas de sous-option ID)
  // Format correct : {"728": {"0": {"from_date_option": "jj/mm/AAAA", "to_date_option": "jj/mm/AAAA"}}}
  { 
    id: "728", 
    label: "Rachat de franchise Véhicule (CDW)", 
    type: "date-range", 
    description: "Couverture dommages jusqu'à 150.000€ — dates de location requises",
  },

  // --- ACCIDENT ---
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

  // --- SPORTS ---
  { 
    id: "828", 
    label: "AVA SPORT+", 
    type: "boolean", 
    description: "Sports extrêmes & Frais de recherche (25k€)",
    defaultSubOptionId: "828" 
  },

  // --- TECH ---
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

export function getOptionsForProduct(productType: string): AvaOption[] {
  return AVA_TOURIST_OPTIONS;
}
