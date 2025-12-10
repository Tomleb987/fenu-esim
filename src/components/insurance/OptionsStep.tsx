import axios from 'axios';
import { format } from 'date-fns';

const AVA_API_URL = process.env.AVA_API_URL || "https://api-ava.fr/api";
const PARTNER_ID = process.env.AVA_PARTNER_ID;
const PASSWORD = process.env.AVA_PASSWORD;

// Authentification (inchangée)
export async function getAvaToken() {
  const params = new URLSearchParams();
  params.append('login', PARTNER_ID!);
  params.append('motDePasse', PASSWORD!);

  const response = await axios.post(`${AVA_API_URL}/authentification/connexion.php`, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data.token;
}

// --- C'EST ICI QUE LA CORRECTION SE FAIT ---
export async function getAvaPrice(data: any) {
  const token = await getAvaToken();
  
  // 1. Calcul du nombre total de personnes
  const companions = data.companions || [];
  const totalTravelers = 1 + companions.length;

  // 2. Gestion du Prix du Voyage (Capital Assuré)
  // AVA demande souvent le capital PAR PERSONNE.
  // Si tripCost est le total (ex: 2000€ pour 2), on divise.
  const totalTripCost = Number(data.tripCost) || 0;
  const costPerPerson = totalTravelers > 0 ? Math.ceil(totalTripCost / totalTravelers) : 0;

  // 3. Construction des paramètres API
  // On utilise URLSearchParams pour gérer proprement l'encodage
  const params = new URLSearchParams();

  // Paramètres communs
  params.append('produit', "30"); // Code 30 = Tourist Card (Vérifiez ce code selon votre contrat !)
  params.append('date_depart', format(new Date(data.startDate), 'dd/MM/yyyy'));
  params.append('date_retour', format(new Date(data.endDate), 'dd/MM/yyyy'));
  params.append('destination', data.destinationRegion || "102"); // 102 = Monde

  // --- BOUCLE SUR LES VOYAGEURS ---
  
  // A. Le Souscripteur (Toujours l'index 1)
  // Format attendu par AVA : date_naissance_1, capital_1
  params.append('date_naissance_1', format(new Date(data.subscriber.birthDate), 'dd/MM/yyyy'));
  params.append('capital_1', costPerPerson.toString());

  // B. Les Accompagnants (Index 2, 3, 4...)
  companions.forEach((comp: any, index: number) => {
    const avaIndex = index + 2; // On commence à 2 car le souscripteur est le 1
    
    if (comp.birthDate) {
        params.append(`date_naissance_${avaIndex}`, format(new Date(comp.birthDate), 'dd/MM/yyyy'));
        params.append(`capital_${avaIndex}`, costPerPerson.toString());
    }
  });

  // Gestion des options (Si vous en avez)
  // Exemple : if (data.options.annulation) params.append('opt_335', '1');

  console.log("📤 Envoi à AVA :", params.toString());

  try {
    const response = await axios.post(
      `${AVA_API_URL}/assurance/tarification/demandeTarif.php`, // Utilisez demandeTarif pour gérer options/multi-pax
      params, 
      {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log("📥 Réponse AVA :", response.data);

    // L'API renvoie souvent le tarif total dans un champ 'tarif_total' ou 'montant'
    // Adaptez selon la réponse réelle vue dans Postman
    if (response.data && response.data.tarif_total) {
        return parseFloat(response.data.tarif_total);
    } 
    // Fallback si la structure est différente
    else if (response.data && response.data.tarif) {
        return parseFloat(response.data.tarif);
    }
    
    throw new Error("Pas de tarif dans la réponse AVA");

  } catch (error: any) {
    console.error("Erreur calcul AVA:", error.response?.data || error.message);
    throw new Error("Erreur lors du calcul AVA");
  }
}

// Fonction de validation (inchangée mais nécessaire)
export async function validateAvaAdhesion(adhesionNumber: string) {
    // ... votre code de validation existant ...
    return true; 
}

// Fonction de création (nécessaire pour insurance-checkout.ts)
export async function createAvaAdhesion(data: any) {
    // ... Logique similaire à getAvaPrice mais vers /creationAdhesion.php ...
    // Pensez à réutiliser la même logique de boucle (date_naissance_X) ici aussi !
    return { adhesion_number: "SIMU-12345", contract_link: null }; // Mock pour l'instant
}
