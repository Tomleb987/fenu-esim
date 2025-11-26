// src/lib/ava.ts

/**
 * Format une date ISO (2025-01-02) → 02/01/2025
 */
function formatDateFR(date: string) {
  if (!date) return "";
  // Si la date est déjà au format français, on la retourne telle quelle
  if (date.includes('/')) return date;
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;

  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

//-------------------------------------------------------
//  1. AUTHENTIFICATION AVA
//-------------------------------------------------------
export async function getAvaToken() {
  // On récupère les variables d'environnement sécurisées
  const apiUrl = process.env.AVA_API_URL;
  const partnerId = process.env.AVA_PARTNER_ID;
  const password = process.env.AVA_PASSWORD;

  // Vérification de sécurité : est-ce que les variables existent ?
  if (!apiUrl || !partnerId || !password) {
    console.error("❌ ERREUR CONFIGURATION : Variables AVA manquantes.");
    console.error("Vérifiez AVA_API_URL, AVA_PARTNER_ID et AVA_PASSWORD dans Vercel.");
    throw new Error("Erreur interne : Configuration serveur incomplète");
  }

  const endpoint = `${apiUrl}/authentification/connexion.php`;
  
  const formData = new URLSearchParams();
  formData.append("partnerId", partnerId);
  formData.append("password", password);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const raw = await res.text();
    
    if (!res.ok) {
      console.error(`❌ [AVA] Erreur HTTP ${res.status}:`, raw);
      throw new Error(`Erreur HTTP AVA: ${res.status}`);
    }

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("❌ [AVA] Réponse invalide (pas de JSON):", raw);
      throw new Error("Réponse AVA invalide");
    }

    if (!data.token) {
      console.error("❌ [AVA] Refus de connexion:", data);
      throw new Error("Authentification AVA refusée");
    }

    return data.token;

  } catch (err) {
    console.error("💥 [AVA] Exception:", err);
    return null;
  }
}


//-------------------------------------------------------
//  2. CRÉATION D’ADHÉSION
//-------------------------------------------------------
export async function createAvaAdhesion(quoteData: any) {
  const token = await getAvaToken();
  if (!token) throw new Error("Impossible d'obtenir le token AVA");

  const isIncoming = quoteData.productType.toLowerCase().includes('incoming');
  const baseUrl = process.env.AVA_API_URL;
  const endpoint = `${baseUrl}/assurance/${isIncoming ? 'tarification' : 'adhesion'}/creationAdhesion.php`;

  const formData = new URLSearchParams();

  // Champs obligatoires
  formData.append("productType", quoteData.productType);
  formData.append("journeyStartDate", formatDateFR(quoteData.startDate));
  formData.append("journeyEndDate", formatDateFR(quoteData.endDate));
  formData.append("journeyRegion", "102");
  formData.append("journeyAmount", (quoteData.tripCost || 2000).toString());
  formData.append("internalReference", quoteData.internalReference || "");

  // Compteurs
  const nbCompanions = quoteData.companions ? quoteData.companions.length : 0;
  formData.append("numberAdultCompanions", nbCompanions.toString());
  formData.append("numberChildrenCompanions", "0");
  formData.append("numberCompanions", nbCompanions.toString());

  // Souscripteur
  formData.append(
    "subscriberInfos",
    JSON.stringify({
      firstName: quoteData.subscriber.firstName, 
      lastName: quoteData.subscriber.lastName,   
      birthdate: formatDateFR(quoteData.subscriber.birthDate),
      subscriberEmail: quoteData.subscriber.email,
      subscriberCountry: quoteData.subscriber.countryCode || "PF",
      address: quoteData.subscriber.address,
    })
  );

  // Accompagnateurs
  const companionsList = (quoteData.companions || []).map((c: any) => ({
    firstName: c.firstName,
    lastName: c.lastName,
    birthdate: formatDateFR(c.birthDate),
    parental_link: "13"
  }));
  formData.append("companionsInfos", JSON.stringify(companionsList));

  // Options
  formData.append("option", JSON.stringify(quoteData.options || {}));
  formData.append("prod", "false"); 

  // Envoi
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${token}`,
    },
    body: formData.toString(),
  });

  const raw = await res.text();
  try {
    const data = JSON.parse(raw);
    if (data.code && data.message && !data.id_adhesion) {
        console.error("❌ [AVA] Erreur Métier:", data.message);
        return { error: data.message, raw: data };
    }
    return data;
  } catch {
    return { error: "Format de réponse invalide", raw };
  }
}


//-------------------------------------------------------
//  3. VALIDATION D’ADHÉSION
//-------------------------------------------------------
export async function validateAvaAdhesion(adhesionNumber: string) {
  const token = await getAvaToken();
  if (!token) throw new Error("Token manquant");

  const endpoint = `${process.env.AVA_API_URL}/assurance/adhesion/validationAdhesion.php`;

  const body = new URLSearchParams();
  body.append("numeroAdhesion", adhesionNumber);

  try {
    const res = await fetch(endpoint, {
        method: "POST",
        headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
        },
        body: body.toString(),
    });

    return await res.json();
  } catch (e) {
    console.error("❌ [AVA] Erreur validation:", e);
    return { error: "Erreur technique validation" };
  }
}
