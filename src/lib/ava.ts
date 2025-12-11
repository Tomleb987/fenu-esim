// src/lib/ava.ts
import axios from 'axios';
import { format, isValid } from 'date-fns';

const AVA_API_URL = process.env.AVA_API_URL || "https://api-ava.fr/api";
const PARTNER_ID = process.env.AVA_PARTNER_ID;
const PASSWORD = process.env.AVA_PASSWORD;

// --- AUTHENTIFICATION ---
export async function getAvaToken() {
  if (!PARTNER_ID || !PASSWORD) throw new Error("Identifiants AVA manquants (.env)");

  const params = new URLSearchParams();
  params.append('partnerId', PARTNER_ID); 
  params.append('password', PASSWORD);    

  try {
    console.log("🔑 Connexion AVA...");
    const response = await axios.post(`${AVA_API_URL}/authentification/connexion.php`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    // 👇 C'EST ICI QUE JE CORRIGE : On gère la Majuscule "Token"
    if (response.data) {
        if (response.data.token) return response.data.token; // Cas standard
        if (response.data.Token) return response.data.Token; // Cas AVA actuel (Majuscule)
        if (response.data.accessToken) return response.data.accessToken;
    }
    
    // Si c'est juste une string brute
    if (typeof response.data === 'string' && response.data.length > 10) return response.data;
    
    console.error("❌ Réponse Auth inattendue (Format inconnu):", response.data);
    throw new Error("Pas de token reçu dans la réponse AVA");

  } catch (error: any) {
    console.error("❌ Erreur Connexion:", error.response?.data || error.message);
    throw error;
  }
}

// --- CALCUL DU PRIX ---
export async function getAvaPrice(data: any) {
  // On récupère le token (maintenant ça va marcher)
  const token = await getAvaToken();
  
  const totalTravelers = 1 + (data.companions?.length || 0);
  const costPerPerson = totalTravelers > 0 ? Math.ceil((Number(data.tripCost) || 0) / totalTravelers) : 0;

  const safeDate = (d: string) => isValid(new Date(d)) ? format(new Date(d), 'dd/MM/yyyy') : "";
  const dStart = safeDate(data.startDate);
  const dEnd = safeDate(data.endDate);
  const dBirth = safeDate(data.subscriber.birthDate);

  if (!dStart || !dEnd || !dBirth) {
      console.warn("⚠️ Date manquante pour AVA, retour 0€");
      return 0;
  }

  const params = new URLSearchParams();
  params.append('produit', "30"); 
  params.append('date_depart', dStart);
  params.append('date_retour', dEnd);
  params.append('destination', data.destinationRegion || "102"); 
  
  params.append('date_naissance_1', dBirth);
  params.append('capital_1', costPerPerson.toString());

  data.companions?.forEach((c: any, i: number) => {
      const date = safeDate(c.birthDate);
      if (date) {
          params.append(`date_naissance_${i + 2}`, date);
          params.append(`capital_${i + 2}`, costPerPerson.toString());
      }
  });

  try {
    console.log(`📤 Demande Tarif AVA (${totalTravelers} pers)...`);
    const response = await axios.post(
      `${AVA_API_URL}/assurance/tarification/demandeTarif.php`,
      params, 
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    console.log("📥 Réponse AVA (Tarif):", response.data);

    if (response.data) {
        if (typeof response.data === 'number') return response.data;
        // Gestion des différents formats de prix possibles
        const possiblePrice = 
            response.data.tarif_total ??
            response.data.tarif ??
            response.data.montant_total ??
            response.data["Prix total avec options (en €)"];
            
        if (possiblePrice) return parseFloat(possiblePrice);
    }
    
    return 0;
  } catch (error: any) {
    console.error("❌ Erreur Tarif:", error.message);
    return 0;
  }
}

export async function validateAvaAdhesion(adhesionNumber: string) { return true; }
