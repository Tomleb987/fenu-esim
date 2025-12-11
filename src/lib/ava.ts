// src/lib/ava.ts
import axios from 'axios';
import { format, isValid } from 'date-fns';
import { AVA_TOURIST_OPTIONS } from './ava_options';

const AVA_API_URL = process.env.AVA_API_URL || "https://api-ava.fr/api";
const PARTNER_ID = process.env.AVA_PARTNER_ID;
const PASSWORD = process.env.AVA_PASSWORD;
const IS_PROD = process.env.AVA_ENV === 'prod' ? 'true' : 'false';
const CODE_PRODUIT = "ava_tourist_card";

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
    const date = new Date(d);
    return isValid(date) ? format(date, 'dd/MM/yyyy') : undefined;
};

/**
 * Construit le payload complexe JSON pour AVA
 */
function buildTarificationPayload(data: any): URLSearchParams {
  const companions = data.companions || data.additionalTravelers || [];
  const totalTravelers = 1 + companions.length;
  
  const totalTripCost = Number(data.tripCost) || 0;
  const costPerPerson = totalTravelers > 0 ? Math.ceil(totalTripCost / totalTravelers) : 0;

  const journeyStartDate = toFrDate(data.startDate);
  const journeyEndDate = toFrDate(data.endDate);
  
  // À ce stade (fin de tunnel), on a la vraie date de naissance
  const subscriberBirth = toFrDate(data.subscriber?.birthDate) || "01/01/1980";

  if (!journeyStartDate || !journeyEndDate) throw new Error("Dates invalides");

  const params = new URLSearchParams();

  // --- PARAMÈTRES GLOBAUX ---
  params.append('productType', CODE_PRODUIT);
  params.append('journeyStartDate', journeyStartDate);
  params.append('journeyEndDate', journeyEndDate);
  params.append('journeyAmount', String(costPerPerson)); 
  params.append('journeyRegion', String(data.destinationRegion || "102"));
  
  params.append('numberAdultCompanions', String(companions.length));
  params.append('numberChildrenCompanions', "0");
  params.append('numberCompanions', String(companions.length));

  // --- SUBSCRIBER INFOS (JSON) ---
  const sub = data.subscriber || {};
  const subscriberInfos = {
      subscriberCountry: data.subscriberCountry || "FR",
      birthdate: subscriberBirth,
      firstName: sub.firstName || "Prénom",
      lastName: sub.lastName || "Nom",
      subscriberEmail: sub.email || "client@email.com",
      address: {
          street: sub.address || "Adresse",
          zip: sub.postalCode || "00000",
          city: sub.city || "Ville"
      }
  };
  params.append('subscriberInfos', JSON.stringify(subscriberInfos));

  // --- COMPANIONS INFOS (JSON) ---
  // On mappe les accompagnants
  const companionsInfos = companions.map((c: any) => ({
      firstName: c.firstName || "Accompagnant",
      lastName: c.lastName || "Inconnu",
      birthdate: toFrDate(c.birthDate) || "01/01/1990",
      parental_link: "13" // 13 = Sans parenté (ou mappez si vous avez l'info)
  }));
  params.append('companionsInfos', JSON.stringify(companionsInfos));

  // --- OPTIONS (LE GROS MORCEAU) ---
  const optionsJson: any = {};
  
  if (data.options && Array.isArray(data.options)) {
      data.options.forEach((selectedId: string) => {
          // 1. On trouve l'option parente dans notre config (ex: 335 est parent de 338)
          const parentOption = AVA_TOURIST_OPTIONS.find((opt: any) => 
              opt.id === selectedId || 
              opt.defaultSubOptionId === selectedId || 
              opt.subOptions?.some((sub: any) => sub.id === selectedId)
          );

          if (parentOption) {
              const parentId = parentOption.id; // Ex: "335"
              
              if (!optionsJson[parentId]) optionsJson[parentId] = {};

              // 2. On applique l'option à TOUS les voyageurs (0 = Souscripteur, 1..N = Compagnons)
              // AVA demande : {"335": {"0": "338", "1": "338"}}
              for (let i = 0; i < totalTravelers; i++) {
                  optionsJson[parentId][String(i)] = selectedId;
              }
          }
      });
  }
  
  params.append('option', JSON.stringify(optionsJson));
  params.append('prod', IS_PROD);

  return params;
}

/* --- 2. CALCUL DU PRIX --- */
export async function getAvaPrice(data: any) {
  try {
    const token = await getAvaToken();
    const params = buildTarificationPayload(data);

    console.log(`📤 Tarif AVA (${params.get('journeyAmount')}€/pax)`);

    const response = await axios.post(
      `${AVA_API_URL}/assurance/tarification/demandeTarif.php`,
      params, 
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const d = response.data;
    console.log("📥 Réponse Tarif:", JSON.stringify(d));

    let price = null;
    if (d) {
        price = d["Prix total avec options (en €)"] ?? d.montant_total ?? d.tarif_total ?? d.tarif;
    }

    if (price == null) return 0;
    return parseFloat(String(price));

  } catch (error: any) {
    console.error("❌ Erreur API AVA:", error.response?.data || error.message);
    return 0;
  }
}

/* --- 3. CRÉATION ADHÉSION --- */
export async function createAvaAdhesion(data: any) {
    const token = await getAvaToken();
    const params = buildTarificationPayload(data); 

    console.log("📤 Création Adhésion AVA...");

    try {
        const response = await axios.post(
            `${AVA_API_URL}/assurance/adhesion/creationAdhesion.php`,
            params,
            { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const d = response.data;
        console.log("📥 Réponse Adhésion:", d);

        const adhesionNumber = d?.["Numéro AD"] || d?.numeroAD || d?.adhesion_number;
        const price = d?.["Prix total avec options (en €)"] || d?.montant_total;

        if (!adhesionNumber) throw new Error("Pas de numéro d'adhésion reçu");

        return {
            adhesion_number: adhesionNumber,
            contract_link: d?.["Certificat de garantie"] || null,
            montant_total: price ? parseFloat(String(price)) : 0
        };

    } catch (error: any) {
        console.error("❌ Erreur Adhésion:", error.response?.data || error.message);
        throw new Error("Échec création contrat AVA");
    }
}

export async function validateAvaAdhesion(adhesionNumber: string) { return true; }
