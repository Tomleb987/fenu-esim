// src/lib/ava.ts
import axios from 'axios';
import { format, isValid, parseISO } from 'date-fns'; // Assurez-vous d'importer isValid et parseISO

// ... (Gardez vos constantes et getAvaToken inchangés) ...

export async function getAvaPrice(data: any) {
  const token = await getAvaToken();
  
  const companions = data.companions || [];
  const totalTravelers = 1 + companions.length;
  const totalTripCost = Number(data.tripCost) || 0;
  const costPerPerson = totalTravelers > 0 ? Math.ceil(totalTripCost / totalTravelers) : 0;

  const params = new URLSearchParams();

  // --- SÉCURISATION DES DATES ---
  // Fonction helper pour formater sans crasher
  const safeFormatDate = (dateString: string) => {
    if (!dateString) return ""; // Si vide, on renvoie vide (ou une date par défaut)
    const date = new Date(dateString);
    if (!isValid(date)) return ""; // Si invalide, on renvoie vide
    return format(date, 'dd/MM/yyyy');
  };

  const startDateStr = safeFormatDate(data.startDate);
  const endDateStr = safeFormatDate(data.endDate);
  const subBirthDateStr = safeFormatDate(data.subscriber.birthDate);

  // Si une date essentielle manque, on ne peut pas calculer
  if (!startDateStr || !endDateStr || !subBirthDateStr) {
      console.warn("Date manquante pour le calcul AVA, abandon.");
      return 0; // On retourne 0 au lieu de crasher
  }

  params.append('produit', "30"); 
  params.append('date_depart', startDateStr);
  params.append('date_retour', endDateStr);
  params.append('destination', data.destinationRegion || "102");

  // A. Souscripteur
  params.append('date_naissance_1', subBirthDateStr);
  params.append('capital_1', costPerPerson.toString());

  // B. Accompagnants (Avec sécurité)
  companions.forEach((comp: any, index: number) => {
    const avaIndex = index + 2;
    const birthDateStr = safeFormatDate(comp.birthDate);
    
    // On n'ajoute le voyageur que si sa date est valide
    if (birthDateStr) {
        params.append(`date_naissance_${avaIndex}`, birthDateStr);
        params.append(`capital_${avaIndex}`, costPerPerson.toString());
    }
  });

  console.log("📤 Envoi sécurisé à AVA :", params.toString());

  try {
    const response = await axios.post(
      `${process.env.AVA_API_URL || "https://api-ava.fr/api"}/assurance/tarification/demandeTarif.php`,
      params, 
      {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (response.data && (response.data.tarif_total || response.data.tarif)) {
        return parseFloat(response.data.tarif_total || response.data.tarif);
    }
    return 0;

  } catch (error: any) {
    console.error("Erreur calcul AVA:", error.message);
    return 0; // Retourner 0 évite le crash blanc
  }
}

// ... (Gardez le reste du fichier inchangé)
