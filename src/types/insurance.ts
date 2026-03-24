// src/types/insurance.ts

export interface Traveler {
  firstName: string;
  lastName: string;
  birthDate: string;
  parental_link: string; // ID lien parenté AVA : 1=père/mère, 3=frère/sœur, 4=conjoint, 6=enfant, 13=sans parenté, 17=collègue, 21=autre
}

export interface InsuranceFormData {
  // Voyage
  destination: string;           // ID région AVA : 102, 58, 53
  departureDate: string;
  returnDate: string;
  tripPrice: number;
  subscriberCountry: string;     // code ISO pays résidence

  // Assuré principal
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;

  // Accompagnants
  additionalTravelers: Traveler[];

  // Options
  selectedOptions: string[];
  optionDateRanges?: Record<string, { from_date_option?: string; to_date_option?: string }>;

  // CGU
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptMarketing: boolean;
}
