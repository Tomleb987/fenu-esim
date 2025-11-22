// src/lib/ava_options.ts

export interface AvaOption {
  id: string;
  label: string;
  type: 'boolean' | 'select';
  subOptions?: { id: string; label: string }[];
  defaultSubOptionId?: string;
}

// --- 1. LES PRODUITS ---
export const AVA_PRODUCTS = [
  { 
    id: "ava_tourist_card", 
    title: "Tourist Card", 
    subtitle: "Vacances (- 3 mois)", 
    icon: "🏖️", 
    desc: "L'essentiel pour voyager serein : Frais médicaux, Rapatriement & Bagages.", 
    color: "border-blue-200 bg-blue-50 hover:border-blue-500" 
  },
  { 
    id: "plan_sante_working_holiday_pvt", 
    title: "Plan Santé PVT", 
    subtitle: "Working Holiday", 
    icon: "🎒", 
    desc: "Spécial PVTistes (Australie, Canada...). Couverture travail & loisirs.", 
    color: "border-orange-200 bg-orange-50 hover:border-orange-500" 
  },
  { 
    id: "plan_sante_diginomad", 
    title: "DigiNomad", 
    subtitle: "Télétravailleurs", 
    icon: "💻", 
    desc: "Couverture mondiale adaptée au mode de vie des nomades digitaux.", 
    color: "border-purple-200 bg-purple-50 hover:border-purple-500" 
  },
  { 
    id: "ava_carte_sante", 
    title: "Carte Santé", 
    subtitle: "Tour du monde / Expat", 
    icon: "🌍", 
    desc: "La couverture santé complète pour les longs séjours (jusqu'à 1 an).", 
    color: "border-green-200 bg-green-50 hover:border-green-500" 
  }
];

// --- 2. LES OPTIONS COMPLÈTES ---

// ✅ AVA TOURIST CARD (Tableau complet intégré)
export const AVA_TOURIST_OPTIONS: AvaOption[] = [
  { 
    id: "335", 
    label: "Extension Annulation (Dès l'inscription, tous motifs)", 
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
    label: "Rachat de franchise Véhicule de location (CDW)", 
    type: "boolean", 
    defaultSubOptionId: "458" // A concurrence de 150.000 €
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
    label: "AVA SPORT+ (Sports extrêmes & Recherche 25k€)", 
    type: "boolean", 
    defaultSubOptionId: "828" 
  },
  { 
    id: "990", 
    label: "AVA TECH+ (Appareils Nomades : Vol/Casse)", 
    type: "select", 
    subOptions: [
      { id: "989", label: "Couverture 1.500 €" },
      { id: "988", label: "Couverture 3.000 €" }
    ] 
  }
];

// ✅ PLAN SANTÉ PVT (Working Holiday)
export const AVA_PVT_OPTIONS: AvaOption[] = [
  { 
    id: "1041", 
    label: "AVA TECH+ (Appareils Nomades)", 
    type: "select", 
    subOptions: [
      { id: "1049", label: "Couverture 1.500 €" }, 
      { id: "1048", label: "Couverture 3.000 €" }
    ] 
  },
  { 
    id: "1043", 
    label: "AVA SPORT+ (Sports extrêmes)", 
    type: "boolean", 
    defaultSubOptionId: "1043" 
  },
  { 
    id: "1044", 
    label: "Annulation Vol Sec", 
    type: "select", 
    subOptions: [
      { id: "1052", label: "Billet max 1.000 €" }, 
      { id: "1051", label: "Billet max 2.000 €" }
    ] 
  },
  {
    id: "1042",
    label: "Extension Frais Médicaux France (90j)",
    type: "select",
    subOptions: [
        { id: "1047", label: "Retour temporaire uniquement" },
        { id: "1046", label: "À l'échéance ou retour définitif" },
        { id: "1045", label: "Retour temporaire ET à l'échéance" }
    ]
  }
];

// ✅ PLAN SANTÉ DIGINOMAD
export const AVA_DIGINOMAD_OPTIONS: AvaOption[] = [
  { 
    id: "1061", 
    label: "Augmenter Garantie Bagages (Base 2.000€)", 
    type: "select", 
    subOptions: [
      { id: "1063", label: "Plafond 2.500 €" }, 
      { id: "1062", label: "Plafond 3.000 €" }
    ] 
  },
  {
    id: "1059",
    label: "Extension Frais Médicaux France (90j)",
    type: "select",
    subOptions: [
        { id: "1058", label: "Retour temporaire uniquement" },
        { id: "1057", label: "À l'échéance ou retour définitif" },
        { id: "1056", label: "Retour temporaire ET à l'échéance" }
    ]
  }
];

// ✅ AVA CARTE SANTÉ
export const AVA_CARTE_SANTE_OPTIONS: AvaOption[] = [
  { 
    id: "297", 
    label: "AVA SNO+ (Pack sports d'hiver)", 
    type: "boolean", 
    defaultSubOptionId: "297" 
  },
  { 
    id: "762", 
    label: "AVA SPORT+ (Sports extrêmes)", 
    type: "boolean", 
    defaultSubOptionId: "762" 
  },
  { 
    id: "291", 
    label: "Bagages (Perte, vol, détérioration)", 
    type: "select", 
    subOptions: [
      { id: "292", label: "Plafond 1.500 €" }, 
      { id: "293", label: "Plafond 2.000 €" },
      { id: "294", label: "Plafond 2.500 €" }
    ] 
  },
  {
    id: "456",
    label: "Individuelle Accident (Décès-Invalidité)",
    type: "select",
    subOptions: [
        { id: "303", label: "Capital 50.000 €" },
        { id: "301", label: "Capital 100.000 €" },
        { id: "302", label: "Capital 150.000 €" }
    ]
  }
];

// --- 3. LE SÉLECTEUR ---
export function getOptionsForProduct(productType: string): AvaOption[] {
  switch (productType) {
    case 'ava_tourist_card': return AVA_TOURIST_OPTIONS;
    case 'plan_sante_working_holiday_pvt': return AVA_PVT_OPTIONS;
    case 'plan_sante_diginomad': return AVA_DIGINOMAD_OPTIONS;
    case 'ava_carte_sante': return AVA_CARTE_SANTE_OPTIONS;
    default: return [];
  }
}
