// src/lib/ava_options.ts

export interface AvaOption {
  id: string;
  label: string;
  type: 'boolean' | 'select';
  subOptions?: { id: string; label: string }[];
  defaultSubOptionId?: string;
}

// --- 1. CONFIGURATION PRODUIT UNIQUE ---
export const AVA_PRODUCTS = [
  { 
    id: "ava_tourist_card", 
    title: "Tourist Card", 
    subtitle: "Vacances (- 3 mois)", 
    icon: "🏖️", 
    desc: "L'essentiel pour voyager serein : Frais médicaux, Rapatriement & Bagages.", 
    color: "border-blue-200 bg-blue-50 hover:border-blue-500" 
  }
];

// --- 2. OPTIONS TOURIST CARD ---
export const AVA_TOURIST_OPTIONS: AvaOption[] = [
  { 
    id: "335", 
    label: "Extension Annulation (Tous motifs)", 
    type: "boolean", 
    defaultSubOptionId: "338" 
  },
  { 
    id: "339", 
    label: "Augmenter le plafond Annulation (Base 6.000€)", 
    type: "select", 
    subOptions: [
      { id: "340", label: "Plafond 8.000 €" },
      { id: "341", label: "Plafond 10.000 €" },
      { id: "342", label: "Plafond 12.000 €" }
    ] 
  },
  { 
    id: "343", 
    label: "Augmenter la garantie Bagages (Base 1.500€)", 
    type: "select", 
    subOptions: [
      { id: "344", label: "Plafond 2.000 €" },
      { id: "345", label: "Plafond 2.500 €" },
      { id: "346", label: "Plafond 3.000 €" }
    ] 
  },
  { 
    id: "728", 
    label: "Rachat de franchise Véhicule (CDW)", 
    type: "boolean", 
    defaultSubOptionId: "458"
  },
  { 
    id: "347", 
    label: "Augmenter Capital Accident (Base 8.000€)", 
    type: "select", 
    subOptions: [
      { id: "459", label: "Capital 50.000 €" },
      { id: "457", label: "Capital 100.000 €" }
    ] 
  },
  { 
    id: "828", 
    label: "AVA SPORT+ (Sports extrêmes)", 
    type: "boolean", 
    defaultSubOptionId: "828" 
  },
  { 
    id: "990", 
    label: "AVA TECH+ (Appareils Nomades)", 
    type: "select", 
    subOptions: [
      { id: "989", label: "Couverture 1.500 €" },
      { id: "988", label: "Couverture 3.000 €" }
    ] 
  }
];

// --- 3. SÉLECTEUR SIMPLIFIÉ ---
export function getOptionsForProduct(productType: string): AvaOption[] {
  // On ne gère plus que la Tourist Card
  if (productType === 'ava_tourist_card') {
    return AVA_TOURIST_OPTIONS;
  }
  return [];
}
