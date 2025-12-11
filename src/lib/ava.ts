import axios from "axios";
import { format } from "date-fns";

const AVA_API_URL = process.env.AVA_API_URL || "https://api-ava.fr/api";
const PARTNER_ID = process.env.AVA_PARTNER_ID;
const PASSWORD = process.env.AVA_PASSWORD;

function assertEnvVar(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`La variable d'environnement ${name} est manquante`);
  }
}

// 🔐 Authentification
export async function getAvaToken() {
  assertEnvVar("AVA_PARTNER_ID", PARTNER_ID);
  assertEnvVar("AVA_PASSWORD", PASSWORD);

  // Équivalent de :
  // curl --form 'partnerId=...' --form 'password=...'
  const params = new URLSearchParams();
  params.append("partnerId", PARTNER_ID!);
  params.append("password", PASSWORD!);

  const response = await axios.post(
    `${AVA_API_URL}/authentification/connexion.php`,
    params,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  console.log("Réponse AVA auth :", response.data);

  // ⚠️ Si le champ s'appelle autrement (ex: accessToken), adapte ici
  if (!response.data?.token) {
    throw new Error("Token AVA manquant dans la réponse");
  }

  return response.data.token as string;
}

// --- 💰 Calcul de tarif ---
export async function getAvaPrice(data: any) {
  const token = await getAvaToken();

  const companions = data.companions || [];
  const totalTravelers = 1 + companions.length;

  const totalTripCost = Number(data.tripCost) || 0;
  const costPerPerson =
    totalTravelers > 0 ? Math.ceil(totalTripCost / totalTravelers) : 0;

  const params = new URLSearchParams();

  params.append("produit", "30"); // à confirmer selon ton contrat
  params.append(
    "date_depart",
    format(new Date(data.startDate), "dd/MM/yyyy")
  );
  params.append(
    "date_retour",
    format(new Date(data.endDate), "dd/MM/yyyy")
  );
  params.append("destination", data.destinationRegion || "102");

  params.append(
    "date_naissance_1",
    format(new Date(data.subscriber.birthDate), "dd/MM/yyyy")
  );
  params.append("capital_1", costPerPerson.toString());

  companions.forEach((comp: any, index: number) => {
    const avaIndex = index + 2;

    if (comp.birthDate) {
      params.append(
        `date_naissance_${avaIndex}`,
        format(new Date(comp.birthDate), "dd/MM/yyyy")
      );
      params.append(`capital_${avaIndex}`, costPerPerson.toString());
    }
  });

  console.log("📤 Envoi à AVA (tarif) :", params.toString());

  try {
    const response = await axios.post(
      `${AVA_API_URL}/assurance/tarification/demandeTarif.php`,
      params,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("📥 Réponse AVA (tarif) :", response.data);
    const d = response.data;

    // ➜ À adapter selon la doc AVA (nom du champ de tarif total)
    if (d?.tarif_total) {
      return parseFloat(d.tarif_total);
    }
    if (d?.tarif) {
      return parseFloat(d.tarif);
    }

    throw new Error("Pas de tarif exploitable dans la réponse AVA");
  } catch (error: any) {
    console.error("Erreur calcul AVA:", error.response?.data || error.message);
    throw new Error("Erreur lors du calcul AVA");
  }
}

export async function validateAvaAdhesion(adhesionNumber: string) {
  // TODO: implémenter quand tu auras la doc AVA sur la validation
  return true;
}

export async function createAvaAdhesion(data: any) {
  // TODO: implémenter la création d’adhésion AVA AVEC la vraie doc :
  // - URL exacte de création
  // - paramètres obligatoires
  // - lecture de id_adhesion / id_contrat / lien contrat
  // Pour l’instant, on refuse plutôt que simuler.
  throw new Error(
    "createAvaAdhesion n'est pas encore implémentée avec l'API AVA réelle"
  );
}
