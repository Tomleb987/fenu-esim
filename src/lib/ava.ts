import axios from "axios";
import { format } from "date-fns";

const AVA_API_URL = process.env.AVA_API_URL || "https://api-ava.fr/api";
const PARTNER_ID = process.env.AVA_PARTNER_ID;
const PASSWORD = process.env.AVA_PASSWORD;

function assertEnvVar(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`La variable d'environnement ${name} est manquante`);
  }
}

/* -------------------------------------------------------------------------- */
/* 1️⃣ AUTHENTIFICATION AVA                                                   */
/* -------------------------------------------------------------------------- */

export async function getAvaToken() {
  assertEnvVar("AVA_PARTNER_ID", PARTNER_ID);
  assertEnvVar("AVA_PASSWORD", PASSWORD);

  // Équivalent du curl officiel AVA :
  // curl --location 'https://api-ava.fr/api/authentification/connexion.php' \
  //   --form 'partnerId="<id partenaire>"' \
  //   --form 'password="<mot de passe partenaire>"'
  const params = new URLSearchParams();
  params.append("partnerId", PARTNER_ID!);
  params.append("password", PASSWORD!);

  const response = await axios.post(
    `${AVA_API_URL}/authentification/connexion.php`,
    params,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  console.log("🔑 Réponse AVA auth brute :", response.data);

  const data = response.data;

  // La réponse peut être :
  // - une simple string = token
  // - un objet { token: "..."} ou { accessToken: "..." }
  let token: string | undefined;

  if (typeof data === "string") {
    token = data.trim() || undefined;
  } else if (data && typeof data === "object") {
    token =
      (data.token as string | undefined) ||
      (data.accessToken as string | undefined) ||
      (data.Token as string | undefined);
  }

  if (!token) {
    console.error("❌ Auth AVA : format de réponse inattendu :", data);
    throw new Error("Impossible de récupérer le token AVA");
  }

  return token;
}

/* -------------------------------------------------------------------------- */
/* Helpers de formatage                                                       */
/* -------------------------------------------------------------------------- */

function toFrDate(
  dateStr: string | Date | undefined | null
): string | undefined {
  if (!dateStr) return undefined;
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (Number.isNaN(d.getTime())) return undefined;
  return format(d, "dd/MM/yyyy");
}

/**
 * Construit le payload pour la tarification complexe / création adhésion
 * à partir de la structure `quoteData` que tu envoies depuis le front.
 */
function buildTarificationPayload(data: any): URLSearchParams {
  const companions = data.companions || data.additionalTravelers || [];
  const totalTravelers = 1 + companions.length;

  const totalTripCost = Number(data.tripCost) || 0;
  // AVA attend journeyAmount = prix par personne
  const journeyAmount =
    totalTravelers > 0 ? Math.ceil(totalTripCost / totalTravelers) : 0;

  const journeyStartDate = toFrDate(data.startDate);
  const journeyEndDate = toFrDate(data.endDate);

  if (!journeyStartDate || !journeyEndDate) {
    throw new Error("Dates de voyage invalides pour AVA");
  }

  const params = new URLSearchParams();

  // Champs principaux (doc AVA tarification complexe / création adhésion)
  params.append("productType", data.productType || "ava_tourist_card");
  params.append("journeyStartDate", journeyStartDate);
  params.append("journeyEndDate", journeyEndDate);
  params.append("journeyAmount", String(journeyAmount));

  // Si tu as une zone/destination, tu peux l'envoyer ici (optionnel selon contrat)
  if (data.destinationRegion != null) {
    params.append("journeyRegion", String(data.destinationRegion));
  }

  // Compagnons
  const numberAdultCompanions = companions.length;
  const numberChildrenCompanions = 0; // à adapter si tu gères les enfants à part

  params.append("numberAdultCompanions", String(numberAdultCompanions));
  params.append("numberChildrenCompanions", String(numberChildrenCompanions));
  params.append("numberCompanions", String(companions.length));

  // Infos souscripteur
  const subscriber = data.subscriber || {};
  const subscriberInfos: any = {
    subscriberCountry: data.subscriberCountry || "FR",
  };

  const birth = toFrDate(subscriber.birthDate);
  if (birth) subscriberInfos.birthdate = birth;
  if (subscriber.firstName) subscriberInfos.firstName = subscriber.firstName;
  if (subscriber.lastName) subscriberInfos.lastName = subscriber.lastName;
  if (subscriber.email) subscriberInfos.subscriberEmail = subscriber.email;

  if (subscriber.address || subscriber.postalCode || subscriber.city) {
    subscriberInfos.address = {
      street: subscriber.address || "",
      zip: subscriber.postalCode || subscriber.zip || "",
      city: subscriber.city || "",
    };
  }

  params.append("subscriberInfos", JSON.stringify(subscriberInfos));

  // Infos compagnons
  if (companions.length > 0) {
    const companionsInfos = companions.map((c: any) => ({
      firstName: c.firstName,
      lastName: c.lastName,
      birthdate: c.birthDate ? toFrDate(c.birthDate) : undefined,
      // 13 = "Sans parenté" par défaut (à adapter si tu veux gérer le lien)
      parental_link: c.parental_link || "13",
    }));
    params.append("companionsInfos", JSON.stringify(companionsInfos));
  }

  // Options (JSON) – peut rester vide si tu ne gères pas encore
  if (data.options && Object.keys(data.options).length > 0) {
    params.append("option", JSON.stringify(data.options));
  }

  // prod : false = test, true = production
  params.append("prod", data.prod === true ? "true" : "false");

  if (data.internalReference) {
    params.append("internalReference", String(data.internalReference));
  }

  return params;
}

/* -------------------------------------------------------------------------- */
/* 2️⃣ TARIFICATION AVA – demandeTarif.php                                    */
/* -------------------------------------------------------------------------- */

export async function getAvaPrice(data: any) {
  const token = await getAvaToken();
  const params = buildTarificationPayload(data);

  console.log("📤 Envoi à AVA (tarif) :", params.toString());

  try {
    const response = await axios.post(
      `${AVA_API_URL}/assurance/tarification/demandeTarif.php`,
      params,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("📥 Réponse AVA (tarif) :", response.data);
    const d: any = response.data;

    // Plusieurs possibilités selon le contrat / format,
    // plus le cas vu sur ta capture :
    // "Prix total avec options (en €)": 450
    let price: any = null;

    if (d && typeof d === "number") {
      price = d;
    } else if (d?.["Prix total avec options (en €)"] != null) {
      price = d["Prix total avec options (en €)"];
    } else if (d?.tarif_total != null) {
      price = d.tarif_total;
    } else if (d?.tarif != null) {
      price = d.tarif;
    } else if (d?.montant_total != null) {
      price = d.montant_total;
    }

    if (price == null) {
      throw new Error(
        "Pas de champ de tarif exploitable dans la réponse AVA : " +
          JSON.stringify(d)
      );
    }

    const numPrice = parseFloat(String(price));
    if (Number.isNaN(numPrice)) {
      throw new Error("Tarif AVA non numérique : " + String(price));
    }

    return numPrice;
  } catch (error: any) {
    console.error(
      "Erreur calcul AVA:",
      error.response?.data || error.message
    );
    throw new Error("Erreur lors du calcul AVA");
  }
}

/* -------------------------------------------------------------------------- */
/* 3️⃣ CRÉATION D’ADHÉSION – creationAdhesion.php                              */
/* -------------------------------------------------------------------------- */

export async function createAvaAdhesion(data: any) {
  const token = await getAvaToken();

  // même payload que la tarification complexe,
  // mais on force prod=true par défaut pour réellement créer le contrat
  const params = buildTarificationPayload({
    ...data,
    prod: data.prod ?? true,
  });

  console.log("📤 Envoi à AVA (adhésion) :", params.toString());

  try {
    const response = await axios.post(
      `${AVA_API_URL}/assurance/adhesion/creationAdhesion.php`,
      params,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("📥 Réponse AVA (adhésion) :", response.data);
    const d: any = response.data;

    // Exemple de réponse (d’après ta capture) :
    // {
    //   "Numéro IN": "IN/24-367828",
    //   "Numéro AD": "AD/24-274582",
    //   "Prix total avec options (en €)": 450,
    //   "Certificat de garantie": "https://...",
    //   "CG": "https://...",
    //   "IPID": "https://...",
    //   "FICP": "https://..."
    // }

    const adhesionNumber =
      d?.["Numéro AD"] || d?.numeroAD || d?.adhesion_number;
    const contractNumber =
      d?.["Numéro IN"] || d?.numeroIN || d?.contract_number;
    const totalPriceRaw =
      d?.["Prix total avec options (en €)"] ??
      d?.montant_total ??
      d?.tarif_total ??
      d?.tarif;

    if (!adhesionNumber) {
      throw new Error(
        "Numéro d'adhésion manquant dans la réponse AVA : " +
          JSON.stringify(d)
      );
    }

    const totalPrice =
      totalPriceRaw != null ? parseFloat(String(totalPriceRaw)) : null;

    return {
      adhesion_number: adhesionNumber,
      contract_number: contractNumber || null,
      montant_total: totalPrice,
      contract_link:
        d?.["Certificat de garantie"] ||
        d?.certificat ||
        d?.certificate ||
        null,
      cg_link: d?.CG || null,
      ipid_link: d?.IPID || null,
      ficp_link: d?.FICP || null,
      raw: d, // réponse brute pour debug/archivage
    };
  } catch (error: any) {
    console.error(
      "Erreur création adhésion AVA:",
      error.response?.data || error.message
    );
    throw new Error("Erreur lors de la création de l'adhésion AVA");
  }
}

/* -------------------------------------------------------------------------- */
/* 4️⃣ (optionnel) Validation d’adhésion                                      */
/* -------------------------------------------------------------------------- */

export async function validateAvaAdhesion(adhesionNumber: string) {
  // La doc AVA prévoit une route de validation,
  // tu pourras l’implémenter ici si tu veux vérifier le statut du contrat.
  console.log("validateAvaAdhesion non implémentée, adhésion :", adhesionNumber);
  return true;
}
