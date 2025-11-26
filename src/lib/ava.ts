// src/lib/ava.ts

/**
 * Format une date ISO (2025-01-02) → 02/01/2025
 * Format requis par l'API AVA.
 */
function formatDateFR(date: string) {
  if (!date) return "";
  // Si la date est déjà au format français, on la retourne telle quelle
  if (date.includes('/')) return date;
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return date; // Sécurité si date invalide

  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

//-------------------------------------------------------
//  1. AUTHENTIFICATION AVA
//-------------------------------------------------------
export async function getAvaToken() {
  const apiUrl = process.env.AVA_API_URL;
  const partnerId = process.env.AVA_PARTNER_ID;
  const password = process.env.AVA_PASSWORD;

  if (!apiUrl || !partnerId || !password) {
    console.error("❌ ERREUR CRITIQUE : Variables AVA manquantes.");
    throw new Error("Configuration serveur incomplète");
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
    
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("❌ [AVA] Réponse Auth non-JSON:", raw);
      return null;
    }

    // Vérification Token (Majuscule T ou minuscule t selon l'API)
    const token = data.Token || data.token;

    if (!token) {
      console.error("❌ [AVA] Auth refusée :", data);
      throw new Error("Authentification AVA échouée");
    }

    console.log("✅ [AVA] Token récupéré !");
    return token;

  } catch (err) {
    console.error("💥 [AVA] Exception Auth:", err);
    return null;
  }
}


//-------------------------------------------------------
//  2. CRÉATION D’ADHÉSION (AVEC LOGS DE DEBUG)
//-------------------------------------------------------
export async function createAvaAdhesion(quoteData: any) {
  console.log("🟦 [AVA] Création adhésion → Produit:", quoteData.productType);

  const token = await getAvaToken();
  if (!token) throw new Error("Token manquant");

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
  const companionsCount = quoteData.companions ? quoteData.companions.length : 0;
  formData.append("numberAdultCompanions", companionsCount.toString());
  formData.append("numberChildrenCompanions", "0");
  formData.append("numberCompanions", companionsCount.toString());

  // Souscripteur
  const subscriberJson = JSON.stringify({
    firstName: quoteData.subscriber.firstName, 
    lastName: quoteData.subscriber.lastName,   
    birthdate: formatDateFR(quoteData.subscriber.birthDate),
    subscriberEmail: quoteData.subscriber.email,
    subscriberCountry: quoteData.subscriber.countryCode || "PF",
    address: {
      street: quoteData.subscriber.address.street,
      zip: quoteData.subscriber.address.zip,
      city: quoteData.subscriber.address.city,
    },
  });
  formData.append("subscriberInfos", subscriberJson);

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

  // APPEL API
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${token}`,
    },
    body: formData.toString(),
  });

  const raw = await res.text();
  
  // 👇 LOGS CRITIQUES POUR LE DÉBOGAGE 👇
  console.log("🔍 [DEBUG] Réponse Brute AVA Adhésion :", raw);

  try {
    const data = JSON.parse(raw);
    
    if (data.code && data.message && !data.id_adhesion && !data.id_contrat) {
        console.error("❌ [AVA] Erreur Métier:", data.message);
        return { error: data.message, raw: data };
    }

    console.log("🟩 [AVA] Succès API !");
    console.log("📦 [DEBUG] Objet reçu :", JSON.stringify(data, null, 2)); // Pour voir la structure exacte

    return data;
  } catch {
    console.error("❌ [AVA] Erreur parsing réponse:", raw);
    return { error: "Format de réponse AVA invalide", raw };
  }
}


//-------------------------------------------------------
//  3. VALIDATION D’ADHÉSION
//-------------------------------------------------------
export async function validateAvaAdhesion(adhesionNumber: string) {
  console.log("🟦 [AVA] Validation contrat n°", adhesionNumber);

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

    const raw = await res.text();
    console.log("🔍 [DEBUG] Réponse Brute AVA Validation :", raw);
    
    try {
        const data = JSON.parse(raw);
        console.log("🟩 [AVA] Contrat validé :", data);
        return data;
    } catch {
        console.log("🟧 [AVA] Validation non-JSON (OK si 200):", raw);
        return { success: true, raw };
    }

  } catch (e) {
    console.error("❌ [AVA] Erreur validation:", e);
    return { error: "Erreur technique validation" };
  }
}
