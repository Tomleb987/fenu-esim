export interface AvaOption {
  id: string;
  label: string;
  type: 'boolean' | 'select';
  subOptions?: { id: string; label: string }[];
  defaultSubOptionId?: string;
  description?: string;
  price?: number;
}

// OPTIONS TOURIST CARD
export const AVA_TOURIST_OPTIONS: AvaOption[] = [
  { 
    id: "335", 
    label: "Extension Annulation (Tous motifs)", 
    type: "boolean", 
    defaultSubOptionId: "338",
    description: "Remboursement en cas d'imprévu"
  },
  { 
    id: "339", 
    label: "Augmenter le plafond Annulation", 
    type: "select", 
    subOptions: [
      { id: "340", label: "Plafond 8.000 €" },
      { id: "341", label: "Plafond 10.000 €" }
    ] 
  },
  { 
    id: "828", 
    label: "Sports à risques (AVA SPORT+)", 
    type: "boolean", 
    defaultSubOptionId: "828" 
  }
];

export function getOptionsForProduct(productType: string): AvaOption[] {
  return AVA_TOURIST_OPTIONS;
}
