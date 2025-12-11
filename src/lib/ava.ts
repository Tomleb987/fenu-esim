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

  // Équivalent du curl AVA :
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

  console.log("🔑 Réponse AVA auth brute :", {
    data: response.data,
    headers: response.headers,
    status: response.status,
  });

  const data = response.data;
  let token: string | undefined;

  // 1) Body = string → on prend la chaîne telle quelle
  if (typeof data === "string" && data.trim()) {
    token = data.trim();
  }

  // 2) Body = objet JSON → on cherche token / accessToken / Token
  if (!token && data && typeof data === "object") {
    const maybeToken =
      (data.token as string | undefined) ||
      (data.accessToken as string | undefined) ||
      (data.Token as string | undefined);
    if (maybeToken && String(maybeToken).trim()) {
      token = String(maybeToken).trim();
    }
  }

  // 3) Header Authorization: Bearer xxx
  if (!token && response.headers) {
    const authHeader =
      (response.headers["authorization"] as string | undefined) ||
      (response.headers["Authorization"] as string | undefined);

    if (authHeader && authHeader.trim()) {
      const match = authHeader.match(/Bearer\s+(.+)/i);
      if (match && match[1]) {
        token = match[1].trim();
      } else {
        token = authHeader.trim();
      }
    }
  }

  // 4) Autre header contenant "token" (ex: X-Auth-Token, Token, etc.)
  if (!token && response.headers) {
    const headerKey = Object.keys(response.headers).find((k) =>
      k.toLowerCase().includes("token")
    );
    if (headerKey) {
      const headerVal = response.headers[headerKey] as string | string[] | undefined;
      if (Array.isArray(headerVal)) {
        token = headerVal[0]?.trim();
      } else if (typeof headerVal === "string" && headerVal.trim()) {
        token = headerVal.trim();
      }
    }
  }

  if (!token) {
    // ➜ C'est cette erreur que tu voyais dans /api/get-quote
    throw new Error(
      "Token AVA manquant dans la réponse d'authentification"
    );
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
 * à partir de la structure `quoteData` envoyée depuis le front.
 */
function buildTarificationPayload(data: any): URLSearchParams {
  const companions = data.companions || data.additionalTravelers || [];
  const totalTravelers = 1 + companions.length;

  const totalTripCost = Number(data.tripCost) || 0;
  // journeyAmount = prix de voyage par personne (doc AVA)
  const journeyAmount =
    totalTravelers > 0 ? Math.ceil(totalTripCost / totalTravelers) : 0;

  const journeyStartDate = toFrDate(data.startDate);
  const journeyEndDate = toFrDate(data.endDate);

  if (!journeyStartDate || !journeyEndDate) {
    throw new Error("Dates de voyage invalides pour AVA");
  }

  const params = new URLSearchParams();

  params.append("productType", data.productType || "ava_tourist_card");
  params.append("journeyStartDate", journeyStartDate);
  params.append("journeyEndDate", journeyEndDate);
  params.append("journeyAmount", String(journeyAmount));

  if (data.destinationRegion != null) {
    params.append("journeyRegion", String(data.destinationRegion));
  }

  const companionsArr = companions || [];
  params.append("numberAdultCompanions", String(companionsArr.length));
  params.append("numberChildrenCompanions", "0");
  params.append("numberCompanions", String(companionsArr.length));

  // Souscripteur
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

  // Compagnons
  if (companionsArr.length > 0) {
    const companionsInfos = companionsArr.map((c: any) => ({
      firstName: c.firstName,
      lastName: c.lastName,
      birthdate: c.birthDate ? toFrDate(c.birthDate) : undefined,
      // 13 = "Sans parenté" par défaut
      parental_link: c.parental_link || "13",
    }));
    params.append("companionsInfos", JSON.stringify(companionsInfos));
  }

  // Options (facultatif)
  if (data.options && Object.keys(data.options).length > 0) {
    params.append("option", JSON.stringify(data.options));
  }

  // prod : false = test, true = prod
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

  const params = buildTarificationPayload({
    ...data,
    prod: data.prod ?? true, // pour créer un vrai contrat par défaut
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
      raw: d,
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
/* 4️⃣ Validation d’adhésion (stub pour plus tard)                            */
/* -------------------------------------------------------------------------- */

export async function validateAvaAdhesion(adhesionNumber: string) {
  console.log("validateAvaAdhesion non implémentée, adhésion :", adhesionNumber);
  return true;
}
