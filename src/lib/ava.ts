import axios from 'axios';
import { format } from 'date-fns';

const AVA_API_URL = process.env.AVA_API_URL || "https://api-ava.fr/api";
const PARTNER_ID = process.env.AVA_PARTNER_ID;
const PASSWORD = process.env.AVA_PASSWORD;

function assertEnvVar(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`La variable d'environnement ${name} est manquante`);
  }
}

/* -------------------------------------------------------------------------- */
/* 1️⃣ AUTHENTIFICATION AVA                                                  */
/* -------------------------------------------------------------------------- */

export async function getAvaToken() {
  assertEnvVar('AVA_PARTNER_ID', PARTNER_ID);
  assertEnvVar('AVA_PASSWORD', PASSWORD);

  const params = new URLSearchParams();
  params.append('partnerId', PARTNER_ID!);
  params.append('password', PASSWORD!);

  const response = await axios.post(`${AVA_API_URL}/authentification/connexion.php`, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const data = response.data;
  let token: string | undefined;

  // Gestion robuste des différents formats de réponse Token (Majuscule/Minuscule/Body)
  if (data && typeof data === 'object') {
      token = data.Token || data.token || data.accessToken;
  }
  
  if (!token && typeof data === 'string' && data.length > 20) {
      token = data; // Cas où le token est renvoyé brut
  }

  if (!token) {
    console.error("Auth Fail:", data);
    throw new Error("Token AVA manquant dans la réponse d'authentification");
  }

  return token;
}

/* -------------------------------------------------------------------------- */
/* Helpers de formatage                                                       */
/* -------------------------------------------------------------------------- */

// Format requis par AVA : jj/mm/AAAA
function toFrDate(dateStr: string | Date | undefined | null): string | undefined {
  if (!dateStr) return undefined;
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (Number.isNaN(d.getTime())) return undefined;
  return format(d, 'dd/MM/yyyy');
}

/**
 * Construit le payload pour la tarification complexe
 */
function buildTarificationPayload(data: any): URLSearchParams {
  const companions = data.companions || data.additionalTravelers || [];
  const totalTravelers = 1 + companions.length;
  
  const totalTripCost = Number(data.tripCost) || 0;
  // journeyAmount = prix de voyage par personne
  const journeyAmount = totalTravelers > 0 ? Math.ceil(totalTripCost / totalTravelers) : 0;

  const journeyStartDate = toFrDate(data.startDate);
  const journeyEndDate = toFrDate(data.endDate);

  if (!journeyStartDate || !journeyEndDate) {
      throw new Error("Dates de voyage invalides pour AVA");
  }

  const params = new URLSearchParams();

  // --- PARAMÈTRES EN ANGLAIS (SELON DOC) ---
  params.append('productType', "ava_tourist_card"); // Snake_case obligatoire
  params.append('journeyStartDate', journeyStartDate);
  params.append('journeyEndDate', journeyEndDate);
  params.append('journeyAmount', String(journeyAmount));
  
  // Destination : 102 (Monde), 58 (USA/Can), 53 (Europe)
  if (data.destinationRegion != null) {
      params.append('journeyRegion', String(data.destinationRegion));
  } else {
      params.append('journeyRegion', "102");
  }

  // Nombres de passagers
  // Note: On considère ici que tout le monde est adulte par défaut pour simplifier, 
  // sauf si vous avez l'âge exact pour trier.
  params.append('numberAdultCompanions', String(companions.length)); 
  params.append('numberChildrenCompanions', "0");
  params.append('numberCompanions', String(companions.length));

  // --- SUBSCRIBER INFOS (JSON STRING) ---
  const subscriber = data.subscriber || {};
  const subscriberInfos: any = {
      subscriberCountry: data.subscriberCountry || "FR",
      birthdate: toFrDate(subscriber.birthDate) || "01/01/1980"
  };
  
  // Ajout des infos facultatives si présentes
  if (subscriber.firstName) subscriberInfos.firstName = subscriber.firstName;
  if (subscriber.lastName) subscriberInfos.lastName = subscriber.lastName;
  if (subscriber.email) subscriberInfos.subscriberEmail = subscriber.email;
  
  params.append('subscriberInfos', JSON.stringify(subscriberInfos));

  // --- COMPANIONS INFOS (JSON STRING) ---
  if (companions.length > 0) {
      const companionsInfos = companions.map((c: any) => ({
          firstName: c.firstName || "Accompagnant",
          lastName: c.lastName || "Inconnu",
          birthdate: toFrDate(c.birthDate) || "01/01/1990",
          parental_link: "13" // 13 = Sans parenté par défaut, ou mappez selon vos données
      }));
      params.append('companionsInfos', JSON.stringify(companionsInfos));
  }

  // --- OPTIONS (JSON STRING) ---
  // Si vous avez des options, format {"ID_OPTION": {"0": "ID_SOUS_OPTION"}}
  // Pour l'instant on laisse vide ou on adapte si vous avez des options cochées
  // params.append('option', JSON.stringify({...})); 

  // Mode PROD ou TEST
  // Attention : La doc dit "false" pour TEST (String), pas booléen JS
  const isProd = process.env.AVA_ENV === 'prod' ? 'true' : 'false';
  params.append('prod', isProd);

  return params;
}

/* -------------------------------------------------------------------------- */
/* 2️⃣ TARIFICATION AVA – demandeTarif.php                                  */
/* -------------------------------------------------------------------------- */

export async function getAvaPrice(data: any) {
  const token = await getAvaToken();
  const params = buildTarificationPayload(data);

  console.log("📤 Envoi à AVA (tarif) :", params.toString());

  try {
    const response = await axios.post(
      `${AVA_API_URL}/assurance/tarification/demandeTarif.php`, // Endpoint complexe
      params, 
      {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log("📥 Réponse AVA (tarif) :", response.data);
    const d: any = response.data;

    // Recherche du prix dans la réponse (plusieurs formats possibles selon le succès/échec)
    let price: any = null;
    
    // Si la réponse est directement un chiffre (cas simple)
    if (typeof d === 'number') {
        price = d;
    } 
    // Sinon on cherche les clés JSON
    else if (d) {
        price = d["Prix total avec options (en €)"] ?? 
                d.montant_total ?? 
                d.tarif_total ?? 
                d.tarif;
    }

    if (price == null) {
        // Cas d'erreur métier renvoyé en JSON 200
        if (d.erreur || d.message) {
             throw new Error(`Erreur Métier AVA: ${d.erreur || d.message}`);
        }
        return 0; // Fallback
    }

    return parseFloat(String(price));

  } catch (error: any) {
    console.error("❌ Erreur calcul AVA:", error.response?.data || error.message);
    throw new Error("Erreur lors du calcul AVA");
  }
}

/* -------------------------------------------------------------------------- */
/* 3️⃣ Validation (Stub)                                                     */
/* -------------------------------------------------------------------------- */

export async function validateAvaAdhesion(adhesionNumber: string) {
    return true; 
}
