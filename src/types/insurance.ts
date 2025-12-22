// src/types/insurance.ts

export interface Traveler {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string; // YYYY-MM-DD
  relationship: string;
}

export interface SelectedOption {
  optionId: string;
  subOptionId?: string;
}

export interface InsuranceFormData {
  // Config
  productType: string;

  // Step 1: Voyage
  destination: string;
  departureDate: string;
  returnDate: string;
  tripPrice: number;
  subscriberCountry: string;

  // Step 2: Souscripteur
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;

  // Step 3: Voyageurs
  additionalTravelers: Traveler[];

  // Step 4: Options
  selectedOptions: SelectedOption[];

  // Step 5: Consentement
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptMarketing: boolean;
}

export const DESTINATIONS = [
  "Polynésie Française",
  "France",
  "Europe",
  "États-Unis",
  "Canada",
  "Australie",
  "Nouvelle-Zélande",
  "Asie",
  "Monde entier",
];

// Helper pour mapper la destination vers le code AVA
export function getAvaRegionCode(dest: string): number {
  if (dest === "États-Unis" || dest === "Canada") return 58;
  if (dest === "Europe") return 53;
  return 102; // Monde par défaut
}
