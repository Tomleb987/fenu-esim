export interface AvaOption {
  id: string;
  label: string;
  type: 'boolean' | 'select';
  subOptions?: { id: string; label: string }[];
  defaultSubOptionId?: string;
}

export const AVA_PRODUCTS = [
  { id: "ava_tourist_card", title: "Tourist Card", subtitle: "Vacances (- 3 mois)", icon: "🏖️", desc: "L'essentiel pour voyager serein.", color: "border-blue-200 bg-blue-50 hover:border-blue-500" },
  { id: "plan_sante_working_holiday_pvt", title: "Plan Santé PVT", subtitle: "Working Holiday", icon: "🎒", desc: "Spécial PVTistes (Australie, Canada...).", color: "border-orange-200 bg-orange-50 hover:border-orange-500" },
  { id: "plan_sante_diginomad", title: "DigiNomad", subtitle: "Télétravailleurs", icon: "💻", desc: "Couverture mondiale pour nomades digitaux.", color: "border-purple-200 bg-purple-50 hover:border-purple-500" },
  { id: "ava_carte_sante", title: "Carte Santé", subtitle: "Tour du monde / Expat", icon: "🌍", desc: "Couverture santé complète longs séjours.", color: "border-green-200 bg-green-50 hover:border-green-500" }
];

export const AVA_TOURIST_OPTIONS: AvaOption[] = [
  { id: "335", label: "Extension Annulation", type: "boolean", defaultSubOptionId: "338" },
  { id: "828", label: "AVA SPORT+ (Sports extrêmes)", type: "boolean", defaultSubOptionId: "828" },
  { id: "990", label: "AVA TECH+ (Nomades)", type: "select", subOptions: [{ id: "989", label: "1.500 €" }, { id: "988", label: "3.000 €" }] }
];

export function getOptionsForProduct(productType: string): AvaOption[] {
  if (productType === 'ava_tourist_card') return AVA_TOURIST_OPTIONS;
  return []; 
}
