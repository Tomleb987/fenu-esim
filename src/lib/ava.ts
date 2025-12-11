// src/lib/ava.ts
import axios from 'axios';
import { format, isValid } from 'date-fns';

const AVA_API_URL = process.env.AVA_API_URL || "https://api-ava.fr/api";
const PARTNER_ID = process.env.AVA_PARTNER_ID;
const PASSWORD = process.env.AVA_PASSWORD;

// --- 1. AUTHENTIFICATION (Celle qui fonctionne !) ---
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
    // On gère la Majuscule "Token" renvoyée par AVA
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

// --- 2. CALCUL DU PRIX (Avec les bons paramètres PHP) ---
export async function getAvaPrice(data: any) {
  const token = await getAvaToken();
  
  // 1. Calcul du nombre de personnes et du coût par tête
  const companions = data.companions || [];
  const totalTravelers = 1 + companions.length;
  const totalTripCost = Number(data.tripCost) || 0;
  // AVA demande souvent le capital PAR personne pour l'option annulation
  const costPerPerson = totalTravelers > 0 ? Math.ceil(totalTripCost / totalTravelers) : 0;

  // 2. Formatage des dates (dd/mm/yyyy)
  const safeDate = (d: string) => {
    if (!d) return "";
    const date = new Date(d);
    return isValid(date) ? format(date, 'dd/MM/yyyy') : "";
  };

  const dStart = safeDate(data.startDate);
  const dEnd = safeDate(data.endDate);
  const dBirth = safeDate(data.subscriber.birthDate);

  if (!dStart || !dEnd || !dBirth) {
      console.warn("⚠️ Dates manquantes pour AVA, impossible de coter.");
      return 0;
  }

  // 3. Mapping du code produit
  // Si le front envoie "ava_tourist_card", on doit envoyer "30" (ou le code de votre contrat)
  let codeProduit = "30"; 
  if (data.productType === "ava_tourist_card") codeProduit = "30";
  // Ajoutez d'autres cas si nécessaire

  // 4. Construction des paramètres (Format Français attendu par PHP)
  const params = new URLSearchParams();
  params.append('produit', codeProduit);
  params.append('date_depart', dStart);
  params.append('date_retour', dEnd);
  params.append('destination', String(data.destinationRegion || "102")); 

  // Souscripteur (Toujours l'index 1)
  params.append('date_naissance_1', dBirth);
  params.append('capital_1', costPerPerson.toString());

  // Compagnons (Index 2, 3...)
  companions.forEach((comp: any, index: number) => {
    const avaIndex = index + 2;
    const cBirth = safeDate(comp.birthDate);
    if (cBirth) {
        params.append(`date_naissance_${avaIndex}`, cBirth);
        params.append(`capital_${avaIndex}`, costPerPerson.toString());
    }
  });

  // Options (Ex: opt_335=1)
  if (data.options && typeof data.options === 'object') {
      // Si options est un tableau d'IDs ou un objet
      const opts = Array.isArray(data.options) ? data.options : Object.keys(data.options);
      opts.forEach((optId: string) => {
          params.append(`opt_${optId}`, '1');
      });
  }

  console.log(`📤 Envoi Tarif AVA (Produit: ${codeProduit}, Pax: ${totalTravelers})`);

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
        // L'API peut renvoyer le prix sous plusieurs clés
        const p = response.data.tarif_total 
               ?? response.data.tarif 
               ?? response.data.montant_total 
               ?? response.data["Prix total avec options (en €)"];
        
        if (p) return parseFloat(p);
    }
    
    return 0;

  } catch (error: any) {
    console.error("❌ Erreur calcul AVA:", error.response?.data || error.message);
    // On renvoie l'erreur détaillée pour comprendre le 400 si ça se reproduit
    throw new Error(JSON.stringify(error.response?.data || error.message));
  }
}

// --- 3. VALIDATION (Stub) ---
export async function validateAvaAdhesion(adhesionNumber: string) {
    return true; 
}

// --- 4. CREATION ADHESION (Stub si nécessaire) ---
export async function createAvaAdhesion(data: any) {
    // À adapter comme getAvaPrice quand le tarif fonctionnera
    return { adhesion_number: "SIMU-000", contract_link: null };
}
