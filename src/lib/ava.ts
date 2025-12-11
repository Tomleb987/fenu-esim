// src/lib/ava.ts
import axios from 'axios';
import { format, isValid } from 'date-fns';

const AVA_API_URL = process.env.AVA_API_URL || "https://api-ava.fr/api";
const PARTNER_ID = process.env.AVA_PARTNER_ID;
const PASSWORD = process.env.AVA_PASSWORD;
// On peut définir le mode via une variable d'env, sinon 'false' par sécurité (Mode Test)
const IS_PROD = process.env.AVA_ENV === 'prod' ? 'true' : 'false';

// --- 1. AUTHENTIFICATION ---
export async function getAvaToken() {
  if (!PARTNER_ID || !PASSWORD) {
    throw new Error("Identifiants AVA manquants (.env)");
  }

  const params = new URLSearchParams();
  params.append('partnerId', PARTNER_ID);
  params.append('password', PASSWORD);

  try {
    console.log("🔑 Connexion AVA...");
    const response = await axios.post(`${AVA_API_URL}/authentification/connexion.php`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const d = response.data;
    if (d && d.Token) return d.Token;
    if (d && d.token) return d.token;
    if (typeof d === 'string' && d.length > 20) return d;

    console.error("❌ Réponse Auth inattendue:", d);
    throw new Error("Pas de token valide reçu");

  } catch (error: any) {
    console.error("❌ Erreur Auth:", error.response?.data || error.message);
    throw error;
  }
}

// --- 2. CALCUL DU PRIX ---
export async function getAvaPrice(data: any) {
  const token = await getAvaToken();
  
  // Calculs préparatoires
  const companions = data.companions || [];
  const totalTravelers = 1 + companions.length;
  const totalTripCost = Number(data.tripCost) || 0;
  const costPerPerson = totalTravelers > 0 ? Math.ceil(totalTripCost / totalTravelers) : 0;

  // Formatage des dates
  const safeDate = (d: string) => {
    if (!d) return "";
    const date = new Date(d);
    return isValid(date) ? format(date, 'dd/MM/yyyy') : "";
  };

  const dStart = safeDate(data.startDate);
  const dEnd = safeDate(data.endDate);
  const dBirth = safeDate(data.subscriber.birthDate);

  if (!dStart || !dEnd || !dBirth) {
      console.warn("⚠️ Dates manquantes pour AVA.");
      return 0;
  }

  // Construction des paramètres
  const params = new URLSearchParams();
  
  // --- LE FIX EST ICI : On ajoute le paramètre 'prod' ---
  params.append('prod', IS_PROD); 
  
  params.append('produit', "30"); // Code Tourist Card
  params.append('date_depart', dStart);
  params.append('date_retour', dEnd);
  params.append('destination', String(data.destinationRegion || "102")); 

  // Souscripteur
  params.append('date_naissance_1', dBirth);
  params.append('capital_1', costPerPerson.toString());

  // Compagnons
  companions.forEach((comp: any, index: number) => {
    const avaIndex = index + 2;
    const cBirth = safeDate(comp.birthDate);
    if (cBirth) {
        params.append(`date_naissance_${avaIndex}`, cBirth);
        params.append(`capital_${avaIndex}`, costPerPerson.toString());
    }
  });

  // Options
  if (data.options && typeof data.options === 'object') {
      const opts = Array.isArray(data.options) ? data.options : Object.keys(data.options);
      opts.forEach((optId: string) => {
          params.append(`opt_${optId}`, '1');
      });
  }

  console.log(`📤 Envoi Tarif AVA (Produit: 30, Pax: ${totalTravelers}, Prod: ${IS_PROD})`);

  try {
    const response = await axios.post(
      `${AVA_API_URL}/assurance/tarification/demandeTarif.php`,
      params, 
      {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log("📥 Réponse AVA:", response.data);

    // Extraction du prix
    if (response.data) {
        const p = response.data.tarif_total 
               ?? response.data.tarif 
               ?? response.data.montant_total 
               ?? response.data["Prix total avec options (en €)"];
        
        if (p) return parseFloat(p);
    }
    
    return 0;

  } catch (error: any) {
    console.error("❌ Erreur calcul AVA:", error.response?.data || error.message);
    throw new Error(JSON.stringify(error.response?.data || error.message));
  }
}

// --- 3. VALIDATION (Stub) ---
export async function validateAvaAdhesion(adhesionNumber: string) {
    return true; 
}
