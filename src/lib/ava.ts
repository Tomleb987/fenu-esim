// src/lib/ava.ts

/**
 * Format une date ISO (2025-01-02) → 02/01/2025
 */
function formatDateFR(dateStr: string) {
  if (!dateStr) return "";
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return "";
}

// 1. AUTHENTIFICATION
export async function getAvaToken() {
  const endpoint = `${process.env.AVA_API_URL}/authentification/connexion.php`;
  const formData = new URLSearchParams();
  formData.append("partnerId", process.env.AVA_PARTNER_ID || "");
  formData.append("password", process.env.AVA_PASSWORD || "");

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
    const data = await res.json();
    // Gère Token (maj) ou token (min)
    const token = data.Token || data.token;
    if (!token) throw new Error("Pas de token reçu");
    return token;
  } catch (err) {
    console.error("💥 [AVA] Auth Error:", err);
    return null;
  }
}

// 2. ESTIMATION DU PRIX (Le Devis)
// Appelle demandeTarif.php -> Ne crée PAS de dossier chez AVA
export async function getAvaPrice(quoteData: any) {
  const token = await getAvaToken();
  if (!token) throw new Error("Auth AVA échouée");

  const isIncoming = quoteData.productType.includes('incoming');
  const endpoint = `${process.env.AVA_API_URL}/assurance/${isIncoming ? 'tarification' : 'tarification'}/demandeTarif.php`;

  const formData = new URLSearchParams();
  formData.append("productType", quoteData.productType);
  formData.append("journeyStartDate", formatDateFR(quoteData.startDate));
  formData.append("journeyEndDate", formatDateFR(quoteData.endDate));
  formData.append("journeyRegion", "102"); // Monde
  
  // Prix estimé pour le calcul
  const travelers = 1 + (quoteData.companions?.length || 0);
  const price = quoteData.tripCost || (quoteData.tripCostPerPerson ? quoteData.tripCostPerPerson * travelers : 2000);
  formData.append("journeyAmount", price.toString());

  formData.append("numberAdultCompanions", (quoteData.companions?.length || 0).toString());
  formData.append("numberChildrenCompanions", "0");
  formData.append("numberCompanions", (quoteData.companions?.length || 0).toString());

  // Info minimale requise pour le tarif
  formData.append("subscriberInfos", JSON.stringify({
    birthdate: formatDateFR(quoteData.subscriber.birthDate),
    subscriberCountry: quoteData.subscriber.countryCode || "PF"
  }));

  // Dates de naissance des accompagnateurs (impacte le prix)
  const companionsList = (quoteData.companions || []).map((c: any) => ({
    birthdate: formatDateFR(c.birthDate),
    parental_link: "13"
  }));
  formData.append("companionsInfos", JSON.stringify(companionsList));
  
  formData.append("option", JSON.stringify(quoteData.options || {}));
  formData.append("prod", "false");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Bearer ${token}` },
    body: formData.toString(),
  });

  const raw = await res.text();
  try { return JSON.parse(raw); } catch { return { error: "Erreur format prix", raw }; }
}

// 3. CRÉATION ADHÉSION (Le Contrat)
// Appelle creationAdhesion.php -> Crée le dossier "Brouillon"
export async function createAvaAdhesion(quoteData: any) {
  const token = await getAvaToken();
  if (!token) throw new Error("Token manquant");

  const isIncoming = quoteData.productType.toLowerCase().includes('incoming');
  const endpoint = `${process.env.AVA_API_URL}/assurance/${isIncoming ? 'tarification' : 'adhesion'}/creationAdhesion.php`;

  const formData = new URLSearchParams();

  // Prix final (arrondi pour éviter les erreurs)
  let rawPrice = quoteData.tripCost;
  if (!rawPrice && quoteData.tripCostPerPerson) {
     const travelers = 1 + (quoteData.companions?.length || 0);
     rawPrice = quoteData.tripCostPerPerson * travelers;
  }
  const finalPrice = rawPrice ? Math.round(Number(rawPrice)).toString() : "2000";

  // Champs obligatoires
  formData.append("productType", quoteData.productType);
  formData.append("journeyStartDate", formatDateFR(quoteData.startDate));
  formData.append("journeyEndDate", formatDateFR(quoteData.endDate));
  formData.append("journeyRegion", "102");
  formData.append("journeyAmount", finalPrice);
  formData.append("internalReference", quoteData.internalReference || "");

  // Compteurs
  const nbCompanions = quoteData.companions ? quoteData.companions.length : 0;
  formData.append("numberAdultCompanions", nbCompanions.toString());
  formData.append("numberChildrenCompanions", "0");
  formData.append("numberCompanions", nbCompanions.toString());

  // Souscripteur Complet
  formData.append("subscriberInfos", JSON.stringify({
    firstName: quoteData.subscriber.firstName, 
    lastName: quoteData.subscriber.lastName,   
    birthdate: formatDateFR(quoteData.subscriber.birthDate),
    subscriberEmail: quoteData.subscriber.email,
    subscriberCountry: quoteData.subscriber.countryCode || "PF",
    address: quoteData.subscriber.address,
  }));

  // Accompagnateurs Complets
  const companionsList = (quoteData.companions || []).map((c: any) => ({
    firstName: c.firstName,
    lastName: c.lastName,
    birthdate: formatDateFR(c.birthDate),
    parental_link: "13"
  }));
  formData.append("companionsInfos", JSON.stringify(companionsList));

  formData.append("option", JSON.stringify(quoteData.options || {}));
  formData.append("prod", "false"); 

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Bearer ${token}` },
    body: formData.toString(),
  });

  const raw = await res.text();
  try {
    const data = JSON.parse(raw);
    // Gestion des erreurs métier AVA (200 OK mais message d'erreur)
    if (data.code && data.message && !data.id_adhesion && !data.id_contrat) {
        if (Object.keys(data).length === 1 && data["200 OK"]) return { error: data["200 OK"], raw: data };
        return { error: data.message, raw: data };
    }
    return data;
  } catch {
    return { error: "Format invalide", raw };
  }
}

// 4. VALIDATION (Le Webhook)
export async function validateAvaAdhesion(adhesionNumber: string) {
  const token = await getAvaToken();
  const res = await fetch(`${process.env.AVA_API_URL}/assurance/adhesion/validationAdhesion.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Bearer ${token}` },
    body: new URLSearchParams({ numeroAdhesion: adhesionNumber }).toString(),
  });
  return res.json();
}
