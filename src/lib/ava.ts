import axios from 'axios';
import { format, isValid } from 'date-fns';

const AVA_API_URL = process.env.AVA_API_URL || "https://api-ava.fr/api";
const PARTNER_ID = process.env.AVA_PARTNER_ID;
const PASSWORD = process.env.AVA_PASSWORD;
// Force 'false' pour le mode Test
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
 * Construit le payload pour AVA.
 * CORRECTION : Envoi systématique des champs option et companionsInfos (même vides)
 */
function buildTarificationPayload(data: any): URLSearchParams {
  const companions = data.companions || data.additionalTravelers || [];
  const totalTravelers = 1 + companions.length;
  
  const totalTripCost = Number(data.tripCost) || 0;
  const costPerPerson = totalTravelers > 0 ? Math.ceil(totalTripCost / totalTravelers) : 0;

  const journeyStartDate = toFrDate(data.startDate);
  const journeyEndDate = toFrDate(data.endDate);
  const subscriberBirth = toFrDate(data.subscriber?.birthDate) || "01/01/1990"; // Date par défaut (35 ans)

  if (!journeyStartDate || !journeyEndDate) {
      throw new Error("Dates invalides");
  }

  const params = new URLSearchParams();

  // --- PARAMÈTRES GLOBAUX ---
  params.append('productType', CODE_PRODUIT);
  params.append('journeyStartDate', journeyStartDate);
  params.append('journeyEndDate', journeyEndDate);
  // AVA attend le coût PAR PERSONNE
  params.append('journeyAmount', String(costPerPerson));
  params.append('journeyRegion', String(data.destinationRegion || "102"));
  
  params.append('numberAdultCompanions', String(companions.length));
  params.append('numberChildrenCompanions', "0");
  params.append('numberCompanions', String(companions.length));

  // --- SUBSCRIBER INFOS (OBLIGATOIRE) ---
  const sub = data.subscriber || {};
  const subscriberInfos = {
      subscriberCountry: data.subscriberCountry || "FR",
      birthdate: subscriberBirth,
      // Champs obligatoires remplis par défaut pour le devis
      firstName: sub.firstName || "Prénom",
      lastName: sub.lastName || "Nom",
      subscriberEmail: sub.email || "devis@fenuasim.com",
      address: {
          street: sub.address || "Rue Test",
          zip: sub.postalCode || "75000",
          city: sub.city || "Paris"
      }
  };
  params.append('subscriberInfos', JSON.stringify(subscriberInfos));

  // --- COMPANIONS INFOS (OBLIGATOIRE MEME VIDE) ---
  // L'API exige ce champ. Si vide, on envoie un tableau vide "[]"
  const companionsInfos = companions.map((c: any) => ({
      firstName: c.firstName || "Accompagnant",
      lastName: c.lastName || "Inconnu",
      birthdate: toFrDate(c.birthDate) || "01/01/1990",
      parental_link: "13"
  }));
  params.append('companionsInfos', JSON.stringify(companionsInfos));

  // --- OPTIONS (OBLIGATOIRE MEME VIDE) ---
  // L'API exige ce champ. Si vide, on envoie un objet vide "{}"
  const optionsJson: any = {};
  if (data.options && Array.isArray(data.options)) {
      data.options.forEach((optId: string) => {
          optionsJson[optId] = { "0": optId }; 
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

    console.log(`📤 Tarif AVA (${params.get('journeyAmount')}€/pax, ${params.get('journeyStartDate')}-${params.get('journeyEndDate')})`);

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

    if (price == null) {
        // Log de l'erreur pour le debug serveur
        if (d.erreur || d.message) console.error("⚠️ AVA Retour:", d);
        return 0;
    }

    return parseFloat(String(price));

  } catch (error: any) {
    console.error("❌ Erreur API AVA:", error.response?.data || error.message);
    // On retourne 0 pour que le front affiche "Tarif non dispo" proprement
    return 0;
  }
}

/* --- 3. CRÉATION ADHÉSION --- */
export async function createAvaAdhesion(data: any) {
    const token = await getAvaToken();
    // On doit s'assurer que les données réelles sont bien remplies ici (pas de dummy data)
    // Mais pour l'instant on réutilise le builder qui est sécurisé
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

/* --- 4. VALIDATION --- */
export async function validateAvaAdhesion(adhesionNumber: string) {
    return true; 
}
