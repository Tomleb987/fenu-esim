// src/lib/ava.ts
import axios from 'axios';
import { format, isValid } from 'date-fns';
import { AVA_TOURIST_OPTIONS } from './ava_options';

const AVA_API_URL = process.env.AVA_API_URL || "https://api-ava.fr/api";
const PARTNER_ID = process.env.AVA_PARTNER_ID;
const PASSWORD = process.env.AVA_PASSWORD;
const IS_PROD = process.env.AVA_ENV === 'prod' ? 'true' : 'false';
const CODE_PRODUIT = "ava_tourist_card";

// 🔧 LOG DU MODE AU DÉMARRAGE
console.log(`🔧 Mode AVA: IS_PROD=${IS_PROD} (AVA_ENV=${process.env.AVA_ENV})`);

function assertEnvVar(name: string, value: string | undefined) {
  if (!value) throw new Error(`Variable ${name} manquante`);
}

/* --- 1. AUTHENTIFICATION --- */
export async function getAvaToken() {
  assertEnvVar('AVA_PARTNER_ID', PARTNER_ID);
  assertEnvVar('AVA_PASSWORD', PASSWORD);

  const params = new URLSearchParams();
  params.append('partnerId', PARTNER_ID!);
  params.append('password', PASSWORD!);

  try {
    const response = await axios.post(`${AVA_API_URL}/authentification/connexion.php`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const d = response.data;
    console.log("🔑 Réponse Auth AVA:", JSON.stringify(d));

    if (d && d.Token) return d.Token;
    if (d && d.token) return d.token;
    if (typeof d === 'string' && d.length > 20) return d;

    throw new Error("Token non reçu");
  } catch (error: any) {
    console.error("❌ Erreur Auth:", error.message);
    throw error;
  }
}

/* --- HELPERS --- */
const toFrDate = (d: string | undefined | null) => {
    if (!d) return undefined;
    try {
        // Parser manuellement pour éviter le décalage UTC → PF (UTC-10)
        const dateStr = d.split("T")[0]; // prend "2026-02-21" de "2026-02-21T00:00:00Z"
        const [year, month, day] = dateStr.split("-").map(Number);
        if (!year || !month || !day) return undefined;
        const date = new Date(year, month - 1, day);
        return isValid(date) ? format(date, 'dd/MM/yyyy') : undefined;
    } catch {
        return undefined;
    }
};

function buildTarificationPayload(data: any): URLSearchParams {
  const companions = data.companions || data.additionalTravelers || [];
  const totalTravelers = 1 + companions.length;
  
  const totalTripCost = Number(data.tripCost) || 0;
  const costPerPerson = totalTravelers > 0 ? Math.ceil(totalTripCost / totalTravelers) : 0;

  const journeyStartDate = toFrDate(data.startDate);
  const journeyEndDate = toFrDate(data.endDate);
  
  const subscriberBirth = toFrDate(data.subscriber?.birthDate) || "01/01/1990";

  if (!journeyStartDate || !journeyEndDate) throw new Error("Dates invalides");

  const params = new URLSearchParams();

  const productType = data.productType || CODE_PRODUIT;
  params.append('productType', productType);
  params.append('journeyStartDate', journeyStartDate);
  params.append('journeyEndDate', journeyEndDate);
  // journeyAmount non requis pour avantages_pom
  if (productType !== 'avantages_pom') {
    params.append('journeyAmount', String(costPerPerson));
  }
  // journeyRegion uniquement pour ava_pass
  if (productType === 'ava_pass') {
    params.append('journeyRegion', String(data.destinationRegion || "102"));
  }
  // numberAdultCompanions non requis pour avantages_pom
  if (productType !== 'avantages_pom') {
    params.append('numberAdultCompanions', String(companions.length));
  }
  // numberChildrenCompanions requis pour ava_carte_sante
  if (productType === 'ava_carte_sante') {
    const childCount = companions.filter((c: any) => {
      const birth = new Date(c.birthDate);
      const age = (new Date().getFullYear() - birth.getFullYear());
      return age < 20;
    }).length;
    params.append('numberChildrenCompanions', String(childCount));
  } else {
    params.append('numberChildrenCompanions', "0");
  }
  params.append('numberCompanions', String(companions.length));

  const sub = data.subscriber || {};
  const subscriberInfos = {
      subscriberCountry: data.subscriberCountry || "PF",
      birthdate: subscriberBirth,
      firstName: sub.firstName || "Prénom",
      lastName: sub.lastName || "Nom",
      subscriberEmail: sub.email || "devis@fenuasim.com",
      address: {
          street: sub.address || "Rue Test",
          zip: sub.postalCode || "75000",
          city: sub.city || "Paris"
      }
  };

  console.log("👤 subscriberInfos envoyé à AVA:", JSON.stringify(subscriberInfos));
  params.append('subscriberInfos', JSON.stringify(subscriberInfos));

  const companionsInfos = companions.map((c: any) => ({
      firstName: c.firstName || "Accompagnant",
      lastName: c.lastName || "Inconnu",
      birthdate: toFrDate(c.birthDate) || "01/01/1990",
      parental_link: "13"
  }));
  params.append('companionsInfos', JSON.stringify(companionsInfos));

  const optionsJson: any = {};
  
  if (data.options && Array.isArray(data.options)) {
      data.options.forEach((selectedId: string) => {
          const allOptions = getOptionsForProduct(data.productType || CODE_PRODUIT);
          const parentOption = allOptions.find((opt: any) => 
              opt.id === selectedId || 
              opt.defaultSubOptionId === selectedId || 
              opt.subOptions?.some((sub: any) => sub.id === selectedId)
          );

          if (parentOption) {
              const parentId = parentOption.id;
              if (!optionsJson[parentId]) optionsJson[parentId] = {};

              if (parentOption.type === 'date-range') {
                  for (let i = 0; i < totalTravelers; i++) {
                      optionsJson[parentId][String(i)] = {
                          from_date_option: journeyStartDate,
                          to_date_option: journeyEndDate,
                      };
                  }
              } else {
                  for (let i = 0; i < totalTravelers; i++) {
                      optionsJson[parentId][String(i)] = selectedId;
                  }
              }
          }
      });
  }
  
  params.append('option', JSON.stringify(optionsJson));
  params.append('prod', IS_PROD);

  console.log(`📦 Payload AVA — prod=${IS_PROD}, region=${data.destinationRegion}, montant=${costPerPerson}€/pax, options=${JSON.stringify(optionsJson)}`);

  return params;
}

/* --- 2. CALCUL DU PRIX --- */
export async function getAvaPrice(data: any) {
  try {
    const token = await getAvaToken();
    const params = buildTarificationPayload(data);

    console.log(`📤 Appel tarif AVA → demandeTarif.php`);

    const response = await axios.post(
      `${AVA_API_URL}/assurance/tarification/demandeTarif.php`,
      params, 
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const d = response.data;
    console.log("📥 Réponse Tarif AVA (brut):", JSON.stringify(d));

    let price = null;
    if (d) {
        price = d["Prix total avec options (en €)"] ?? d.montant_total ?? d.tarif_total ?? d.tarif;
    }

    if (price == null) {
        console.warn("⚠️ Prix non trouvé dans la réponse AVA. Clés disponibles:", Object.keys(d || {}));
        if (d.erreur || d.message) console.warn("⚠️ Message AVA:", d.erreur || d.message);
        return 0;
    }

    console.log("💰 Prix extrait:", price);
    return parseFloat(String(price));

  } catch (error: any) {
    console.error("❌ Erreur API AVA tarif:", error.response?.data || error.message);
    return 0;
  }
}

/* --- 3. CRÉATION ADHÉSION --- */
export async function createAvaAdhesion(data: any) {
    const token = await getAvaToken();
    const params = buildTarificationPayload(data); 

    console.log("📤 Appel création adhésion AVA → creationAdhesion.php");

    try {
        const response = await axios.post(
            `${AVA_API_URL}/assurance/adhesion/creationAdhesion.php`,
            params,
            { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const d = response.data;
        console.log("📥 Réponse Adhésion AVA (brut):", JSON.stringify(d));

        const adhesionNumber = d?.["Numéro AD"] || d?.numeroAD || d?.adhesion_number;
        const price = d?.["Prix total avec options (en €)"] || d?.montant_total;
        const contractLink = d?.["Certificat de garantie"] || null;

        console.log(`✅ Adhésion créée: ${adhesionNumber} | Prix: ${price} | Certificat: ${contractLink}`);

        if (!adhesionNumber) throw new Error("Pas de numéro d'adhésion reçu");

        return {
            adhesion_number: adhesionNumber,
            contract_link: contractLink,
            montant_total: price ? parseFloat(String(price)) : 0,
            raw: d,
        };

    } catch (error: any) {
        console.error("❌ Erreur Adhésion AVA:", error.response?.data || error.message);
        throw new Error("Échec création contrat AVA");
    }
}

/* --- 4. VALIDATION --- */
export async function validateAvaAdhesion(adhesionNumber: string) {
    const token = await getAvaToken();

    const params = new URLSearchParams();
    params.append('numeroAdhesion', adhesionNumber);

    console.log(`📤 Appel validation adhésion AVA → validationAdhesion.php (${adhesionNumber})`);

    try {
        const response = await axios.post(
            `${AVA_API_URL}/assurance/adhesion/validationAdhesion.php`,
            params,
            { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const d = response.data;
        console.log("📥 Réponse Validation AVA (brut):", JSON.stringify(d));

        const certificatUrl = d?.["Certificat de garantie"] || d?.certificat || d?.certificate_url || null;
        const attestationUrl = d?.["Attestation d'assurance"] || d?.attestation || null;
        const message = d?.message || d?.Message || null;

        console.log(`✅ Validation OK | Certificat: ${certificatUrl} | Attestation: ${attestationUrl}`);

        return {
            success: true,
            certificat_url: certificatUrl,
            attestation_url: attestationUrl,
            message,
        };

    } catch (error: any) {
        console.error("❌ Erreur Validation AVA:", error.response?.data || error.message);
        throw new Error("Échec validation contrat AVA");
    }
}
