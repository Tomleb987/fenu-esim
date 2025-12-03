// lib/ava.ts
const AVA_BASE_URL = "https://api-ava.fr/api";

if (!process.env.AVA_PARTNER_ID || !process.env.AVA_PASSWORD) {
  throw new Error("AVA_PARTNER_ID et AVA_PASSWORD doivent être définis dans les variables d'environnement");
}

export type AvaProductType =
  | "ava_pass"
  | "ava_carte_sante"
  | "ava_zap_voyages"
  | "ava_tourist_card"
  | "ava_incoming_classic"
  | "ava_incoming_studies"
  | "ava_incoming_safehealth"
  | "ava_incoming_safehealth_studies"
  | "plan_sante_studies"
  | "plan_sante_campus"
  | "plan_sante_working_holiday_pvt"
  | "plan_sante_avanture"
  | "plan_sante_diginomad"
  | "avantages_360";

export interface AvaSubscriberInfos {
  subscriberCountry: string; // code ISO, ex: FR, PF
  birthdate: string;         // "jj/mm/AAAA"
  firstName?: string;
  lastName?: string;
  subscriberEmail?: string;
  address?: {
    street: string;
    zip: string;
    city: string;
  };
}

export interface AvaCompanionInfo {
  firstName: string;
  lastName: string;
  birthdate: string;     // "jj/mm/AAAA"
  parental_link: string; // "1","3","4","6","13","17","21"
}

export interface AvaTarifInput {
  productType: AvaProductType;
  journeyStartDate: string; // "jj/mm/AAAA"
  journeyEndDate: string;   // "jj/mm/AAAA"
  journeyAmount: number;    // sans devise
  journeyRegion?: string;   // 102 / 58 / 53… selon doc
  numberAdultCompanions: number;
  numberChildrenCompanions: number;
  numberCompanions?: number;
  subscriberInfos: AvaSubscriberInfos;
  companionsInfos?: AvaCompanionInfo[];
  option?: Record<string, any>; // structure JSON des options AVA
  prod: boolean; // false = TEST, true = PROD
  internalReference?: string;
}

async function getAvaToken(): Promise<string> {
  const body = new URLSearchParams();
  body.append("partnerId", process.env.AVA_PARTNER_ID!);
  body.append("password", process.env.AVA_PASSWORD!);

  const res = await fetch(`${AVA_BASE_URL}/authentification/connexion.php`, {
    method: "POST",
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Erreur AVA auth:", text);
    throw new Error("Échec de l'authentification AVA");
  }

  // La doc ne précise pas clairement le format; on part sur un JSON générique.
  const data: any = await res.json().catch(async () => ({ raw: await res.text() }));
  const token = data.token ?? data.access_token ?? data.raw;

  if (!token) {
    console.error("Réponse inattendue AVA auth:", data);
    throw new Error("Token AVA introuvable dans la réponse");
  }

  return token;
}

export async function demandeTarifComplexe(input: AvaTarifInput): Promise<any> {
  const token = await getAvaToken();

  const body = new URLSearchParams();
  body.append("productType", input.productType);
  body.append("journeyStartDate", input.journeyStartDate);
  body.append("journeyEndDate", input.journeyEndDate);
  body.append("journeyAmount", String(input.journeyAmount));
  body.append("numberAdultCompanions", String(input.numberAdultCompanions));
  body.append("numberChildrenCompanions", String(input.numberChildrenCompanions));

  if (typeof input.numberCompanions === "number") {
    body.append("numberCompanions", String(input.numberCompanions));
  }
  if (input.journeyRegion) {
    body.append("journeyRegion", input.journeyRegion);
  }

  body.append("subscriberInfos", JSON.stringify(input.subscriberInfos));

  if (input.companionsInfos && input.companionsInfos.length > 0) {
    body.append("companionsInfos", JSON.stringify(input.companionsInfos));
  }

  if (input.option) {
    body.append("option", JSON.stringify(input.option));
  }

  body.append("prod", input.prod ? "true" : "false");
  if (input.internalReference) {
    body.append("internalReference", input.internalReference);
  }

  const res = await fetch(`${AVA_BASE_URL}/assurance/tarification/demandeTarif.php`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Erreur AVA tarif:", text);
    throw new Error("Échec de la demande de tarification AVA");
  }

  const data = await res.json().catch(async () => ({ raw: await res.text() }));
  return data;
}

export async function creationAdhesion(input: AvaTarifInput): Promise<any> {
  const token = await getAvaToken();

  const body = new URLSearchParams();
  body.append("productType", input.productType);
  body.append("journeyStartDate", input.journeyStartDate);
  body.append("journeyEndDate", input.journeyEndDate);
  body.append("journeyAmount", String(input.journeyAmount));
  body.append("numberAdultCompanions", String(input.numberAdultCompanions));
  body.append("numberChildrenCompanions", String(input.numberChildrenCompanions));

  if (typeof input.numberCompanions === "number") {
    body.append("numberCompanions", String(input.numberCompanions));
  }
  if (input.journeyRegion) {
    body.append("journeyRegion", input.journeyRegion);
  }

  body.append("subscriberInfos", JSON.stringify(input.subscriberInfos));

  if (input.companionsInfos && input.companionsInfos.length > 0) {
    body.append("companionsInfos", JSON.stringify(input.companionsInfos));
  }

  if (input.option) {
    body.append("option", JSON.stringify(input.option));
  }

  body.append("prod", input.prod ? "true" : "false");
  if (input.internalReference) {
    body.append("internalReference", input.internalReference);
  }

  const res = await fetch(`${AVA_BASE_URL}/assurance/adhesion/creationAdhesion.php`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Erreur AVA création adhésion:", text);
    throw new Error("Échec de la création d'adhésion AVA");
  }

  const data = await res.json().catch(async () => ({ raw: await res.text() }));
  return data;
}

export async function validateAvaAdhesion(adhesionNumber: string): Promise<any> {
  const token = await getAvaToken();

  const body = new URLSearchParams();
  body.append("id_adhesion", adhesionNumber);

  const res = await fetch(`${AVA_BASE_URL}/assurance/adhesion/validationAdhesion.php`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Erreur AVA validation adhésion:", text);
    throw new Error("Échec de la validation d'adhésion AVA");
  }

  const data = await res.json().catch(async () => ({ raw: await res.text() }));
  return data;
}