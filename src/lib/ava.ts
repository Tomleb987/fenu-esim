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
  params.append('partnerId', PARTNER_ID); // ✅ Nom correct selon doc
  params.append('password', PASSWORD);    // ✅ Nom correct selon doc

  try {
    console.log("🔑 Connexion AVA...");
    const response = await axios.post(`${AVA_API_URL}/authentification/connexion.php`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    // Gestion robuste des différents formats de réponse possibles
    if (response.data && response.data.token) return response.data.token;
    if (typeof response.data === 'string' && response.data.length > 5) return response.data;
    
    console.error("❌ Réponse Auth inattendue:", response.data);
    throw new Error("Pas de token reçu");
  } catch (error: any) {
    console.error("❌ Erreur Connexion:", error.response?.data || error.message);
    throw error;
  }
}

// --- CALCUL DU PRIX ---
export async function getAvaPrice(data: any) {
  const token = await getAvaToken();
  
  // Calculs préparatoires
  const totalTravelers = 1 + (data.companions?.length || 0);
  const costPerPerson = totalTravelers > 0 ? Math.ceil((Number(data.tripCost) || 0) / totalTravelers) : 0;

  // Formatage date
  const safeDate = (d: string) => isValid(new Date(d)) ? format(new Date(d), 'dd/MM/yyyy') : "";
  const dStart = safeDate(data.startDate);
  const dEnd = safeDate(data.endDate);
  const dBirth = safeDate(data.subscriber.birthDate);

  if (!dStart || !dEnd || !dBirth) return 0;

  // Construction requête
  const params = new URLSearchParams();
  params.append('produit', "30"); // Tourist Card
  params.append('date_depart', dStart);
  params.append('date_retour', dEnd);
  params.append('destination', data.destinationRegion || "102"); // Monde
  
  // Souscripteur
  params.append('date_naissance_1', dBirth);
  params.append('capital_1', costPerPerson.toString());

  // Voyageurs supp
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

    console.log("📥 Réponse AVA:", response.data);

    // Extraction du prix (Number)
    if (response.data) {
        if (typeof response.data === 'number') return response.data;
        if (response.data.tarif_total) return parseFloat(response.data.tarif_total);
        if (response.data.tarif) return parseFloat(response.data.tarif);
        if (response.data.montant_total) return parseFloat(response.data.montant_total);
        // Cas spécifique JSON mal formé parfois renvoyé
        if (response.data["Prix total avec options (en €)"]) return parseFloat(response.data["Prix total avec options (en €)"]);
    }
    
    return 0;
  } catch (error: any) {
    console.error("❌ Erreur Tarif:", error.message);
    return 0;
  }
}

export async function validateAvaAdhesion(adhesionNumber: string) { return true; }
