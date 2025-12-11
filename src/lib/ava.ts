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

  // Équivalent du curl officiel :
  // curl --form 'partnerId=xxx' --form 'password=xxx'
  const params = new URLSearchParams();
  params.append("partnerId", PARTNER_ID!);
  params.append("password", PASSWORD!);

  const response = await axios.post(
    `${AVA_API_URL}/authentification/connexion.php`,
    params,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  console.log("AVA auth response:", response.data);

  // La doc dit : "renvoi du token avec date d'expiration" :contentReference[oaicite:1]{index=1}
  // Adapte ici si AVA renvoie par ex. { accessToken: "..."} au lieu de { token: "..."}
  if (!response.data?.token) {
    throw new Error("Token AVA manquant dans la réponse d'authentification");
  }

  return response.data.token as string;
}

/* -------------------------------------------------------------------------- */
/* Helpers de formatage                                                       */
/* -------------------------------------------------------------------------- */

function toFrDate(dateStr: string | Date | undefined): string | undefined {
  if (!dateStr) return undefined;
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (Number.isNaN(d.getTime())) return undefined;
  return format(d, "dd/MM/yyyy");
}

/**
 * Transforme notre objet "quoteData" côté app
 * en payload conforme à la tarification complexe AVA. :contentReference[oaicite:2]{index=2}
 */
function buildTarificationPayload(data: any): URLSearchParams {
  const companions = data.companions || [];
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

  params.append("productType", data.productType || "ava_tourist_card");
  params.append("journeyStartDate", journeyStartDate);
  params.append("journeyEndDate", journeyEndDate);
  params.append("journeyAmount", String(journeyAmount));
  params.append("journeyRegion", String(data.destinationRegion || 102));

  // on considère tous les accompagnants comme "adultes" par défaut
  const numberAdultCompanions = companions.length;
  const numberChildrenCompanions = 0;

  params.append("numberAdultCompanions", String(numberAdultCompanions));
  params.append("numberChildrenCompanions", String(numberChildrenCompanions));
  params.append("numberCompanions", String(companions.length));

  // subscriberInfos (JSON)
  const subscriber = data.subscriber || {};
  const subscriberInfos: any = {
    subscriberCountry: data.subscriberCountry || "FR",
  };

  const birth = toFrDate(subscriber.birthDate);
  if (birth) subscriberInfos.birthdate = birth;
  if (subscriber.firstName) subscriberInfos.firstName = subscriber.firstName;
  if (subscriber.lastName) subscriberInfos.lastName = subscriber.lastName;
  if (subscriber.email) subscriberInfos.subscriberEmail = subscriber.email;

  if (subscriber.address || subscriber.zip || subscriber.city) {
    subscriberInfos.address = {
      street: subscriber.address || "",
      zip: subscriber.zip || subscriber.postalCode || "",
      city: subscriber.city || "",
    };
  }

  params.append("subscriberInfos", JSON.stringify(subscriberInfos));

  // companionsInfos (JSON)
  if (companions.length > 0) {
    const companionsInfos = companions.map((c: any) => ({
      firstName: c.firstName,
      lastName: c.lastName,
      birthdate: c.birthDate ? toFrDate(c.birthDate) : undefined,
      // 13 = "Sans parenté" dans la doc AVA :contentReference[oaicite:3]{index=3}
      parental_link: c.parental_link || "13",
    }));
    params.append("companionsInfos", JSON.stringify(companionsInfos));
  }

  // options (JSON) — pour l’instant tu peux laisser {} si tu ne gères pas encore les options
  if (data.options && Object.keys(data.options).length > 0) {
    params.append("option", JSON.stringify(data.options));
  }

  // prod : false = mode test
  params.append("prod", data.prod === true ? "true" : "false");

  if (data.internalReference) {
    params.append("internalReference", String(data.internalReference));
  }

  return params;
}

/* -------------------------------------------------------------------------- */
/* 2️⃣ TARIFICATION COMPLEXE AVA (demandeTarif.php)                           */
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

    // La doc dit "renvoi du prix avec options" mais ne donne pas le nom exact,
    // on gère donc les cas les plus probables + celui vu sur ta capture :
    // "Prix total avec options (en €)" :contentReference[oaicite:4]{index=4}
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
/* 3️⃣ CRÉATION D’ADHÉSION AVA (creationAdhesion.php)                         */
/* -------------------------------------------------------------------------- */

export async function createAvaAdhesion(data: any) {
  const token = await getAvaToken();

  // même payload que la tarification complexe + internalReference :contentReference[oaicite:5]{index=5}
  const params = buildTarificationPayload(data);

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

    // Exemple de réponse dans ta doc / capture :
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

    const totalPrice = totalPriceRaw != null
      ? parseFloat(String(totalPriceRaw))
      : null;

    return {
      // pour ton backend (/api/insurance-checkout)
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
      // on garde la réponse brute au cas où
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
/* 4️⃣ (optionnel) Validation d’adhésion                                      */
/* -------------------------------------------------------------------------- */

export async function validateAvaAdhesion(adhesionNumber: string) {
  // La doc a une route "Validation d'adhésion", mais on ne l'utilise pas encore. :contentReference[oaicite:6]{index=6}
  // Tu pourras l’implémenter plus tard si tu veux vérifier le statut d’un contrat.
  console.log("validateAvaAdhesion non implémentée, adhésion :", adhesionNumber);
  return true;
}
