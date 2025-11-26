// src/lib/ava.ts

/**
 * Format une date ISO (2025-01-02) → 02/01/2025
 */
function formatDateFR(dateStr: string) {
  if (!dateStr) return "";
  // Si déjà formaté, on renvoie tel quel
  if (dateStr.includes('/')) return dateStr;
  
  const parts = dateStr.split('-');
  // Sécurité : on s'assure qu'on a bien Année-Mois-Jour
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return "";
}

// 1. AUTHENTIFICATION
export async function getAvaToken() {
  const apiUrl = process.env.AVA_API_URL;
  const partnerId = process.env.AVA_PARTNER_ID;
  const password = process.env.AVA_PASSWORD;

  if (!apiUrl || !partnerId || !password) {
    console.error("❌ ERREUR CONFIG : Variables AVA manquantes.");
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
    const data = await res.json();
    const token = data.Token || data.token;
    if (!token) throw new Error("Pas de token reçu");
    return token;
  } catch (err) {
    console.error("💥 [AVA] Auth Error:", err);
    return null;
  }
}

// 2. OBTENIR LE TARIF (DEVIS)
// Utilise "demandeTarif.php" -> Ne crée PAS de dossier
export async function getAvaPrice(quoteData: any) {
  const token = await getAvaToken();
  if (!token) throw new Error("Auth AVA échouée");

  const isIncoming = quoteData.productType.includes('incoming');
  const endpoint = `${process.env.AVA_API_URL}/assurance/${isIncoming ? 'tarification' : 'tarification'}/demandeTarif.php`;

  const formData = new URLSearchParams();
  
  // --- CORRECTION PRIX (Par personne) ---
  // Le front envoie le total (tripCost) et le nombre de voyageurs.
  // AVA veut le prix PAR PERSONNE.
  const travelers = 1 + (quoteData.companions?.length || 0);
  let pricePerPerson = 0;

  if (quoteData.tripCost) {
    // Si on a le total, on divise
    pricePerPerson = Math.round(quoteData.tripCost / travelers);
  } else {
    // Valeur par défaut
    pricePerPerson = 2000;
  }
  formData.append("journeyAmount", pricePerPerson.toString());

  // Dates
  formData.append("productType", quoteData.productType);
  formData.append("journeyStartDate", formatDateFR(quoteData.startDate));
  formData.append("journeyEndDate", formatDateFR(quoteData.endDate));
  formData.append("journeyRegion", "102");

  // Compteurs
  formData.append("numberAdultCompanions", (quoteData.companions?.length || 0).toString());
  formData.append("numberChildrenCompanions", "0");
  formData.append("numberCompanions", (quoteData.companions?.length || 0).toString());

  // Infos Assuré (Date Naissance est cruciale pour le tarif)
  formData.append("subscriberInfos", JSON.stringify({
    birthdate: formatDateFR(quoteData.subscriber.birthDate),
    subscriberCountry: quoteData.subscriber.countryCode || "PF"
  }));

  // Infos Accompagnateurs (Dates Naissance)
  const companionsList = (quoteData.companions || []).map((c: any) => ({
    birthdate: formatDateFR(c.birthDate),
    parental_link: "13"
  }));
  formData.append("companionsInfos", JSON.stringify(companionsList));
  
  formData.append("option", JSON.stringify(quoteData.options || {}));
  formData.append("prod", "false");

  console.log("💰 [AVA] Demande Tarif - Prix/Pers:", pricePerPerson, "Dates:", formatDateFR(quoteData.startDate));

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Bearer ${token}` },
    body: formData.toString(),
  });

  const raw = await res.text();
  try { return JSON.parse(raw); } catch { return { error: "Format réponse invalide", raw }; }
}

// 3. CRÉATION ADHÉSION (CONTRAT)
// Utilise "creationAdhesion.php" -> Crée le dossier "Brouillon"
export async function createAvaAdhesion(quoteData: any) {
  const token = await getAvaToken();
  if (!token) throw new Error("Token manquant");

  const isIncoming = quoteData.productType.toLowerCase().includes('incoming');
  const endpoint = `${process.env.AVA_API_URL}/assurance/${isIncoming ? 'tarification' : 'adhesion'}/creationAdhesion.php`;

  const formData = new URLSearchParams();

  // --- CORRECTION PRIX (Par personne) ---
  const travelers = 1 + (quoteData.companions?.length || 0);
  let pricePerPerson = 2000;
  if (quoteData.tripCost) {
    pricePerPerson = Math.round(quoteData.tripCost / travelers);
  }
  formData.append("journeyAmount", pricePerPerson.toString());

  // Champs obligatoires
  formData.append("productType", quoteData.productType);
  formData.append("journeyStartDate", formatDateFR(quoteData.startDate));
  formData.append("journeyEndDate", formatDateFR(quoteData.endDate));
  formData.append("journeyRegion", "102");
  formData.append("internalReference", quoteData.internalReference || "");

  formData.append("numberAdultCompanions", (quoteData.companions?.length || 0).toString());
  formData.append("numberChildrenCompanions", "0");
  formData.append("numberCompanions", (quoteData.companions?.length || 0).toString());

  // Assuré Complet
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

  console.log("📝 [AVA] Création Dossier...");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Bearer ${token}` },
    body: formData.toString(),
  });

  const raw = await res.text();
  try {
    const data = JSON.parse(raw);
    if (data.code && data.message && !data.id_adhesion && !data.id_contrat) {
        if (Object.keys(data).length === 1 && data["200 OK"]) return { error: data["200 OK"], raw: data };
        return { error: data.message, raw: data };
    }
    return data;
  } catch {
    return { error: "Format invalide", raw };
  }
}

// 4. VALIDATION
export async function validateAvaAdhesion(adhesionNumber: string) {
  const token = await getAvaToken();
  const res = await fetch(`${process.env.AVA_API_URL}/assurance/adhesion/validationAdhesion.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Bearer ${token}` },
    body: new URLSearchParams({ numeroAdhesion: adhesionNumber }).toString(),
  });
  return res.json();
}
