// src/lib/ava.ts

/**
 * Format une date ISO (2025-01-02) → 02/01/2025
 */
function formatDateFR(date: string) {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

//-------------------------------------------------------
//  1. AUTHENTIFICATION AVA
//-------------------------------------------------------
export async function getAvaToken() {
  // ✅ UTILISATION DE LA BONNE VARIABLE VERCEL : AVA_API_URL
  const endpoint = `${process.env.AVA_API_URL}/authentification/connexion.php`;

  const formData = new URLSearchParams();
  // ✅ Correction des noms de paramètres (selon doc AVA)
  formData.append("partnerId", process.env.AVA_PARTNER_ID || "");
  formData.append("password", process.env.AVA_PASSWORD || "");

  console.log("🔵 [AVA] Auth → URL:", endpoint);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const raw = await res.text();
    // console.log("🟧 [AVA] Auth → RAW:", raw); // Décommentez pour debug

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("❌ [AVA] Auth → Réponse non-JSON:", raw);
      return null;
    }

    if (!data.token) {
      console.error("❌ [AVA] Auth → Token absent :", data);
      return null;
    }

    return data.token;
  } catch (err) {
    console.error("❌ [AVA] Auth → Erreur:", err);
    return null;
  }
}


//-------------------------------------------------------
//  2. CRÉATION D’ADHÉSION
//-------------------------------------------------------
export async function createAvaAdhesion(quoteData: any) {
  console.log("🟦 [AVA] Création adhésion → Démarrage", quoteData.productType);

  const token = await getAvaToken();
  if (!token) throw new Error("Token manquant (auth AVA impossible)");

  // Détection automatique de l'URL (Incoming vs Standard)
  const isIncoming = quoteData.productType.includes('incoming');
  // ✅ UTILISATION DE LA BONNE VARIABLE VERCEL : AVA_API_URL
  const endpoint = `${process.env.AVA_API_URL}/assurance/${isIncoming ? 'tarification' : 'adhesion'}/creationAdhesion.php`;

  const formData = new URLSearchParams();

  // Champs obligatoires AVA
  formData.append("productType", quoteData.productType);
  formData.append("journeyStartDate", formatDateFR(quoteData.startDate));
  formData.append("journeyEndDate", formatDateFR(quoteData.endDate));
  formData.append("journeyRegion", "102"); // Monde
  formData.append("journeyAmount", (quoteData.tripCost || 2000).toString());
  formData.append("internalReference", quoteData.internalReference || "");

  // Compteurs
  const nbCompanions = quoteData.companions?.length || 0;
  formData.append("numberAdultCompanions", nbCompanions.toString());
  formData.append("numberChildrenCompanions", "0");
  formData.append("numberCompanions", nbCompanions.toString());

  // Souscripteur (Correction des clés JSON : firstName/lastName)
  formData.append(
    "subscriberInfos",
    JSON.stringify({
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
    })
  );

  // Voyageurs supplémentaires
  const companionsFormatted = (quoteData.companions || []).map((c: any) => ({
    firstName: c.firstName,
    lastName: c.lastName,
    birthdate: formatDateFR(c.birthDate),
    parental_link: "13" // Ami/Autre par défaut
  }));
  formData.append("companionsInfos", JSON.stringify(companionsFormatted));

  // Options AVA
  formData.append("option", JSON.stringify(quoteData.options || {}));
  
  formData.append("prod", "false"); // Mode Test

  // Requête AVA
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${token}`,
    },
    body: formData.toString(),
  });

  const raw = await res.text();
  console.log("🟧 [AVA] Création adhésion → RAW:", raw);

  try {
    const data = JSON.parse(raw);
    console.log("🟩 [AVA] Création adhésion → PARSED:", data);
    return data;
  } catch {
    return { error: "Réponse AVA invalide", raw };
  }
}


//-------------------------------------------------------
//  3. VALIDATION D’ADHÉSION (après paiement Stripe)
//-------------------------------------------------------
export async function validateAvaAdhesion(adhesionNumber: string) {
  console.log("🟦 [AVA] Validation → numéro", adhesionNumber);

  const token = await getAvaToken();
  if (!token) throw new Error("Token manquant lors de la validation AVA");

  // ✅ UTILISATION DE LA BONNE VARIABLE VERCEL : AVA_API_URL
  const endpoint = `${process.env.AVA_API_URL}/assurance/adhesion/validationAdhesion.php`;

  const body = new URLSearchParams();
  body.append("numeroAdhesion", adhesionNumber);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${token}`,
    },
    body: body.toString(),
  });

  const raw = await res.text();
  console.log("🟧 [AVA] Validation → RAW:", raw);

  try {
    const data = JSON.parse(raw);
    console.log("🟩 [AVA] Validation → PARSED:", data);
    return data;
  } catch {
    return { error: "Réponse AVA invalide", raw };
  }
}
