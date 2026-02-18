// src/lib/ava.ts
import axios from 'axios';
import { format, isValid } from 'date-fns';
import { AVA_TOURIST_OPTIONS } from './ava_options';

const AVA_API_URL = process.env.AVA_API_URL || "https://api-ava.fr/api";
const PARTNER_ID = process.env.AVA_PARTNER_ID;
const PASSWORD = process.env.AVA_PASSWORD;
// Force le mode 'false' (Test) sauf si la variable d'env est explicitement 'prod'
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
    // Gestion robuste des différents formats de retour du token
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
  
  // Date de naissance par défaut pour le devis si non renseignée (35 ans)
  const subscriberBirth = toFrDate(data.subscriber?.birthDate) || "01/01/1990";

  if (!journeyStartDate || !journeyEndDate) throw new Error("Dates invalides");

  const params = new URLSearchParams();

  // --- PARAMÈTRES GLOBAUX ---
  params.append('productType', CODE_PRODUIT);
  params.append('journeyStartDate', journeyStartDate);
  params.append('journeyEndDate', journeyEndDate);
  // AVA attend le coût PAR PERSONNE pour calculer la prime d'annulation
  params.append('journeyAmount', String(costPerPerson)); 
  params.append('journeyRegion', String(data.destinationRegion || "102"));
  
  params.append('numberAdultCompanions', String(companions.length));
  params.append('numberChildrenCompanions', "0");
  params.append('numberCompanions', String(companions.length));

  // --- SUBSCRIBER INFOS (JSON) ---
  // On remplit les champs obligatoires avec des placeholders si c'est juste un devis
  const sub = data.subscriber || {};
  const subscriberInfos = {
      subscriberCountry: data.subscriberCountry || "FR",
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
  params.append('subscriberInfos', JSON.stringify(subscriberInfos));

  // --- COMPANIONS INFOS (JSON) ---
  const companionsInfos = companions.map((c: any) => ({
      firstName: c.firstName || "Accompagnant",
      lastName: c.lastName || "Inconnu",
      birthdate: toFrDate(c.birthDate) || "01/01/1990",
      parental_link: "13" // 13 = Sans parenté par défaut
  }));
  params.append('companionsInfos', JSON.stringify(companionsInfos));

  // --- OPTIONS (LE GROS MORCEAU) ---
  const optionsJson: any = {};
  
  // 'data.options' contient la liste des IDs sélectionnés (ex: ["338", "989"])
  if (data.options && Array.isArray(data.options)) {
      data.options.forEach((selectedId: string) => {
          // 1. On retrouve l'option parente dans notre config pour avoir le bon ID de groupe
          const parentOption = AVA_TOURIST_OPTIONS.find((opt: any) => 
              opt.id === selectedId || 
              opt.defaultSubOptionId === selectedId || 
              opt.subOptions?.some((sub: any) => sub.id === selectedId)
          );

          if (parentOption) {
              const parentId = parentOption.id; // Ex: "335"
              
              // On initialise l'objet pour ce parent s'il n'existe pas
              if (!optionsJson[parentId]) optionsJson[parentId] = {};

              if (parentOption.type === 'date-range') {
                  // Option 728 (CDW véhicule) : AVA attend des dates from/to, pas un ID de sous-option
                  // On utilise les dates du voyage comme dates de location par défaut
                  for (let i = 0; i < totalTravelers; i++) {
                      optionsJson[parentId][String(i)] = {
                          from_date_option: journeyStartDate,
                          to_date_option: journeyEndDate,
                      };
                  }
              } else {
                  // Options standard (boolean ou select) : on envoie l'ID de la sous-option
                  // Format : {"335": {"0": "338", "1": "338"}}
                  for (let i = 0; i < totalTravelers; i++) {
                      optionsJson[parentId][String(i)] = selectedId;
                  }
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
        // L'API peut renvoyer le prix sous plusieurs clés
        price = d["Prix total avec options (en €)"] ?? d.montant_total ?? d.tarif_total ?? d.tarif;
    }

    if (price == null) {
        if (d.erreur || d.message) console.warn("⚠️ Message AVA:", d.erreur || d.message);
        return 0;
    }

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

/* --- 4. VALIDATION --- */
// Appelé APRÈS confirmation du paiement Stripe pour activer le contrat AVA
// Le numéro d'adhésion doit être au format "AD/xx-xxxxxx"
export async function validateAvaAdhesion(adhesionNumber: string) {
    const token = await getAvaToken();

    const params = new URLSearchParams();
    params.append('numeroAdhesion', adhesionNumber);

    try {
        const response = await axios.post(
            `${AVA_API_URL}/assurance/adhesion/validationAdhesion.php`,
            params,
            { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const d = response.data;
        console.log("📥 Réponse Validation Adhésion:", d);

        // AVA renvoie un message de validation + certificat + attestation signée
        const certificatUrl = d?.["Certificat de garantie"] || d?.certificat || d?.certificate_url || null;
        const attestationUrl = d?.["Attestation d'assurance"] || d?.attestation || null;
        const message = d?.message || d?.Message || null;

        return {
            success: true,
            certificat_url: certificatUrl,
            attestation_url: attestationUrl,
            message,
        };

    } catch (error: any) {
        console.error("❌ Erreur Validation Adhésion:", error.response?.data || error.message);
        throw new Error("Échec validation contrat AVA");
    }
}
