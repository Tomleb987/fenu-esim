import axios from "axios";
import { format } from "date-fns";

const AVA_API_URL = process.env.AVA_API_URL || "https://api-ava.fr/api";
const PARTNER_ID = process.env.AVA_PARTNER_ID;
const PASSWORD = process.env.AVA_PASSWORD;

// --- Helpers internes ---

function assertEnvVar(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`La variable d'environnement ${name} est manquante`);
  }
}

// Authentification
export async function getAvaToken() {
  assertEnvVar("AVA_PARTNER_ID", PARTNER_ID);
  assertEnvVar("AVA_PASSWORD", PASSWORD);

  const params = new URLSearchParams();
  params.append("login", PARTNER_ID!);
  params.append("motDePasse", PASSWORD!);

  const response = await axios.post(
    `${AVA_API_URL}/authentification/connexion.php`,
    params,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  if (!response.data?.token) {
    throw new Error("Token AVA manquant dans la réponse");
  }

  return response.data.token as string;
}

// --- Calcul de tarif ---
export async function getAvaPrice(data: any) {
  const token = await getAvaToken();

  const companions = data.companions || [];
  const totalTravelers = 1 + companions.length;

  const totalTripCost = Number(data.tripCost) || 0;
  const costPerPerson =
    totalTravelers > 0 ? Math.ceil(totalTripCost / totalTravelers) : 0;

  const params = new URLSearchParams();

  // Produit / dates / destination
  params.append("produit", "30"); // Tourist Card (à confirmer côté contrat)
  params.append(
    "date_depart",
    format(new Date(data.startDate), "dd/MM/yyyy")
  );
  params.append(
    "date_retour",
    format(new Date(data.endDate), "dd/MM/yyyy")
  );
  params.append("destination", data.destinationRegion || "102"); // Monde par défaut

  // Souscripteur (index 1)
  params.append(
    "date_naissance_1",
    format(new Date(data.subscriber.birthDate), "dd/MM/yyyy")
  );
  params.append("capital_1", costPerPerson.toString());

  // Accompagnants (index 2, 3, 4...)
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

  console.log("📤 Envoi à AVA :", params.toString());

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

    console.log("📥 Réponse AVA :", response.data);

    const d = response.data;

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

// Validation (stub pour l’instant)
export async function validateAvaAdhesion(adhesionNumber: string) {
  // TODO: implémenter l'appel réel à AVA pour valider l'adhésion
  return true;
}

// Création d'adhésion (stub pour insurance-checkout)
export async function createAvaAdhesion(data: any) {
  // TODO: adapter avec la vraie route AVA de création d’adhésion
  // réutiliser la logique de mapping (date_naissance_X, capital_X, etc.)
  return { adhesion_number: "SIMU-12345", contract_link: null };
}
