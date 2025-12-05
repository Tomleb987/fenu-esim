// src/lib/ava.ts

/**
 * Format une date ISO (2025-01-02) → 02/01/2025
 * Format requis par l'API AVA.
 */
function formatDateFR(dateStr: string) {
  if (!dateStr) return "";
  if (dateStr.includes('/')) return dateStr;
  
  // Découpage manuel pour éviter les problèmes de fuseau horaire
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return "";
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
      console.error("❌ [AVA] Réponse non-JSON:", raw);
      return null;
    }

    // Gestion Token (Majuscule ou minuscule)
    const token = data.Token || data.token;

    if (!token) {
      console.error("❌ [AVA] Auth refusée :", data);
      throw new Error("Authentification AVA échouée");
    }

    return token;

  } catch (err) {
    console.error("💥 [AVA] Exception Auth:", err);
    return null;
  }
}

//-------------------------------------------------------
//  2. ESTIMATION DU PRIX (DEVIS)
//  Appelle demandeTarif.php -> Ne crée PAS de dossier
//-------------------------------------------------------
export async function getAvaPrice(quoteData: any) {
  const token = await getAvaToken();
  if (!token) throw new Error("Auth AVA échouée");

  const isIncoming = quoteData.productType.includes('incoming');
  // Endpoint de TARIFICATION
  const endpoint = `${process.env.AVA_API_URL}/assurance/${isIncoming ? 'tarification' : 'tarification'}/demandeTarif.php`;

  const formData = new URLSearchParams();
  
  // Calcul du prix par personne (AVA attend le prix par tête, pas le total)
  const travelers = 1 + (quoteData.companions?.length || 0);
  let pricePerPerson = 2000; // Valeur par défaut
  if (quoteData.tripCost) {
    pricePerPerson = Math.round(quoteData.tripCost / travelers);
  }
  
  formData.append("journeyAmount", pricePerPerson.toString());
  formData.append("productType", quoteData.productType);
  formData.append("journeyStartDate", formatDateFR(quoteData.startDate));
  formData.append("journeyEndDate", formatDateFR(quoteData.endDate));
  formData.append("journeyRegion", "102"); // 102 = Monde

  // Compteurs
  formData.append("numberAdultCompanions", (quoteData.companions?.length || 0).toString());
  formData.append("numberChildrenCompanions", "0");
  formData.append("numberCompanions", (quoteData.companions?.length || 0).toString());

  // Infos minimales assuré pour le tarif (Date naissance requise)
  formData.append("subscriberInfos", JSON.stringify({
    birthdate: formatDateFR(quoteData.subscriber.birthDate),
    subscriberCountry: quoteData.subscriber.countryCode || "PF"
  }));

  // Infos Accompagnateurs (Dates naissance requises)
  const companionsList = (quoteData.companions || []).map((c: any) => ({
    birthdate: formatDateFR(c.birthDate),
    parental_link: "13"
  }));
  formData.append("companionsInfos", JSON.stringify(companionsList));
  
  formData.append("option", JSON.stringify(quoteData.options || {}));
  formData.append("prod", "false");

  console.log(`💰 [AVA] Demande Tarif...`);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Bearer ${token}` },
    body: formData.toString(),
  });

  const raw = await res.text();
  try { return JSON.parse(raw); } catch { return { error: "Erreur format prix", raw }; }
}

//-------------------------------------------------------
//  3. CRÉATION ADHÉSION (CONTRAT)
//  Appelle creationAdhesion.php -> Crée le dossier "Brouillon"
//-------------------------------------------------------
export async function createAvaAdhesion(quoteData: any) {
  const token = await getAvaToken();
  if (!token) throw new Error("Token manquant");

  const isIncoming = quoteData.productType.toLowerCase().includes('incoming');
  const endpoint = `${process.env.AVA_API_URL}/assurance/${isIncoming ? 'tarification' : 'adhesion'}/creationAdhesion.php`;

  const formData = new URLSearchParams();

  // Prix par personne
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

  // Assuré Complet (Attention aux clés firstName/lastName)
  formData.append("subscriberInfos", JSON.stringify({
    firstName: quoteData.subscriber.firstName, 
    lastName: quoteData.subscriber.lastName,   
    birthdate: formatDateFR(quoteData.subscriber.birthDate),
    subscriberEmail: quoteData.subscriber.email,
    subscriberCountry: quoteData.subscriber.countryCode || "PF",
    address: quoteData.subscriber.address, // { street, zip, city }
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
    
    // Détection erreur métier AVA (Format {"200 OK": "Erreur..."})
    if (data["200 OK"] && typeof data["200 OK"] === "string") {
        console.error("❌ [AVA] Refus Métier :", data["200 OK"]);
        return { error: data["200 OK"], raw: data };
    }

    if (data.code && data.message && !data.id_adhesion && !data.id_contrat) {
        return { error: data.message, raw: data };
    }
    
    return data;
  } catch {
    return { error: "Format invalide", raw };
  }
}

//-------------------------------------------------------
//  4. VALIDATION (WEBHOOK)
//-------------------------------------------------------
export async function validateAvaAdhesion(adhesionNumber: string) {
  const token = await getAvaToken();
  const res = await fetch(`${process.env.AVA_API_URL}/assurance/adhesion/validationAdhesion.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Bearer ${token}` },
    body: new URLSearchParams({ numeroAdhesion: adhesionNumber }).toString(),
  });
  return res.json();
}
