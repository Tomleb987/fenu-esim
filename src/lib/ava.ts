// src/lib/ava.ts

// --- UTILITAIRE : Format Date (YYYY-MM-DD -> JJ/MM/AAAA) ---
function formatDateFR(dateStr: string) {
  if (!dateStr) return "";
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return "";
}

// 1. AUTHENTIFICATION
export async function getAvaToken() {
  const apiUrl = process.env.AVA_API_URL;
  const partnerId = process.env.AVA_PARTNER_ID;
  const password = process.env.AVA_PASSWORD;

  if (!apiUrl || !partnerId || !password) {
    throw new Error("Configuration AVA manquante (Vérifiez les variables d'environnement)");
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
    // Gère Token (maj) ou token (min) selon la réponse
    const token = data.Token || data.token;
    if (!token) throw new Error("Pas de token reçu");
    return token;
  } catch (err) {
    console.error("💥 [AVA] Auth Error:", err);
    return null;
  }
}

// 2. ESTIMATION DU PRIX (DEVIS)
// Remplace votre fonction 'demandeTarifComplexe'
export async function getAvaPrice(quoteData: any) {
  const token = await getAvaToken();
  if (!token) throw new Error("Auth AVA échouée");

  const isIncoming = quoteData.productType.includes('incoming');
  const endpoint = `${process.env.AVA_API_URL}/assurance/${isIncoming ? 'tarification' : 'tarification'}/demandeTarif.php`;

  const formData = new URLSearchParams();
  
  // Calcul du prix par personne
  const travelers = 1 + (quoteData.companions?.length || 0);
  let pricePerPerson = 2000; 
  if (quoteData.tripCost) {
    pricePerPerson = Math.round(quoteData.tripCost / travelers);
  }
  
  formData.append("journeyAmount", pricePerPerson.toString());
  formData.append("productType", quoteData.productType);
  formData.append("journeyStartDate", formatDateFR(quoteData.startDate)); // ✅ Date corrigée
  formData.append("journeyEndDate", formatDateFR(quoteData.endDate));     // ✅ Date corrigée
  formData.append("journeyRegion", "102");

  formData.append("numberAdultCompanions", (quoteData.companions?.length || 0).toString());
  formData.append("numberChildrenCompanions", "0");
  formData.append("numberCompanions", (quoteData.companions?.length || 0).toString());

  // Infos Assuré
  formData.append("subscriberInfos", JSON.stringify({
    birthdate: formatDateFR(quoteData.subscriber.birthDate), // ✅ Date corrigée
    subscriberCountry: quoteData.subscriber.countryCode || "PF"
  }));

  // Infos Accompagnateurs
  const companionsList = (quoteData.companions || []).map((c: any) => ({
    birthdate: formatDateFR(c.birthDate), // ✅ Date corrigée
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

// 3. CRÉATION ADHÉSION (CONTRAT)
export async function createAvaAdhesion(quoteData: any) {
  const token = await getAvaToken();
  if (!token) throw new Error("Token manquant");

  const isIncoming = quoteData.productType.toLowerCase().includes('incoming');
  const endpoint = `${process.env.AVA_API_URL}/assurance/${isIncoming ? 'tarification' : 'adhesion'}/creationAdhesion.php`;

  const formData = new URLSearchParams();

  // Prix
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

  // Accompagnateurs
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
    
    // Gestion erreur "200 OK" spécifique AVA
    if (data["200 OK"] && typeof data["200 OK"] === "string") {
        return { error: data["200 OK"], raw: data };
    }
    // Gestion erreur standard
    if (data.code && data.message && !data.id_adhesion && !data.id_contrat) {
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
