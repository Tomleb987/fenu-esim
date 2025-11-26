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
  // 1. Vérification des variables d'environnement (Debugging)
  const apiUrl = process.env.AVA_API_URL;
  const partnerId = process.env.AVA_PARTNER_ID;
  const password = process.env.AVA_PASSWORD;

  if (!apiUrl) {
    console.error("❌ ERREUR CRITIQUE : La variable AVA_API_URL est manquante dans .env.local !");
    throw new Error("Configuration serveur manquante (AVA_API_URL)");
  }

  const endpoint = `${apiUrl}/authentification/connexion.php`;

  console.log(`🔵 [AVA] Tentative Auth vers: ${endpoint}`);
  
  const formData = new URLSearchParams();
  // Noms des champs corrigés selon la documentation AVA
  formData.append("partnerId", partnerId || "");
  formData.append("password", password || "");

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
      console.error("❌ [AVA] Réponse non-JSON reçue:", raw);
      throw new Error("Réponse AVA invalide (Pas du JSON)");
    }

    if (!data.token) {
      console.error("❌ [AVA] Auth refusée (Pas de token):", data);
      throw new Error(data.message || "Authentification AVA échouée");
    }

    console.log("✅ [AVA] Token récupéré avec succès !");
    return data.token;

  } catch (err) {
    console.error("💥 [AVA] Exception Auth:", err);
    return null;
  }
}


//-------------------------------------------------------
//  2. CRÉATION D’ADHÉSION (DEVIS + CONTRAT)
//-------------------------------------------------------
export async function createAvaAdhesion(quoteData: any) {
  console.log("🟦 [AVA] Création adhésion → Produit:", quoteData.productType);

  // 1. On récupère le token
  const token = await getAvaToken();
  if (!token) {
    throw new Error("Impossible de récupérer le token AVA (Vérifiez vos identifiants)");
  }

  // 2. Détection automatique de l'URL (Gamme Incoming vs Standard)
  const isIncoming = quoteData.productType.toLowerCase().includes('incoming');
  const baseUrl = process.env.AVA_API_URL;
  const endpoint = `${baseUrl}/assurance/${isIncoming ? 'tarification' : 'adhesion'}/creationAdhesion.php`;

  const formData = new URLSearchParams();

  // ---------------------------------------------------
  // CHAMPS OBLIGATOIRES
  // ---------------------------------------------------
  formData.append("productType", quoteData.productType);
  formData.append("journeyStartDate", formatDateFR(quoteData.startDate));
  formData.append("journeyEndDate", formatDateFR(quoteData.endDate));
  formData.append("journeyRegion", "102"); // 102 = Monde Entier (par défaut)
  
  // Le prix doit être une chaîne de caractères
  const price = quoteData.tripCost ? quoteData.tripCost.toString() : "2000";
  formData.append("journeyAmount", price);
  
  formData.append("internalReference", quoteData.internalReference || `REF-${Date.now()}`);

  // ---------------------------------------------------
  // COMPTEURS VOYAGEURS
  // ---------------------------------------------------
  const companionsCount = quoteData.companions ? quoteData.companions.length : 0;
  formData.append("numberAdultCompanions", companionsCount.toString());
  formData.append("numberChildrenCompanions", "0");
  formData.append("numberCompanions", companionsCount.toString());

  // ---------------------------------------------------
  // SOUSCRIPTEUR (JSON)
  // ---------------------------------------------------
  // Attention aux noms des clés : firstName/lastName pour l'API
  const subscriberJson = JSON.stringify({
    firstName: quoteData.subscriber.firstName, 
    lastName: quoteData.subscriber.lastName,   
    birthdate: formatDateFR(quoteData.subscriber.birthDate),
    subscriberEmail: quoteData.subscriber.email,
    subscriberCountry: quoteData.subscriber.countryCode || "PF", // Code pays (Polynésie par défaut)
    address: {
      street: quoteData.subscriber.address.street,
      zip: quoteData.subscriber.address.zip,
      city: quoteData.subscriber.address.city,
    },
  });
  formData.append("subscriberInfos", subscriberJson);

  // ---------------------------------------------------
  // ACCOMPAGNATEURS (Tableau JSON)
  // ---------------------------------------------------
  const companionsList = (quoteData.companions || []).map((c: any) => ({
    firstName: c.firstName,
    lastName: c.lastName,
    birthdate: formatDateFR(c.birthDate),
    parental_link: "13" // "13" = Ami/Autre (Valeur par défaut si non précisé)
  }));
  formData.append("companionsInfos", JSON.stringify(companionsList));

  // ---------------------------------------------------
  // OPTIONS & CONFIG
  // ---------------------------------------------------
  formData.append("option", JSON.stringify(quoteData.options || {}));
  
  // Mettez à 'true' uniquement quand vous passez en production réelle
  formData.append("prod", "false"); 

  // ---------------------------------------------------
  // ENVOI REQUÊTE
  // ---------------------------------------------------
  console.log(`🚀 [AVA] Envoi requête vers ${endpoint}...`);
  
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${token}`,
    },
    body: formData.toString(),
  });

  const raw = await res.text();
  // console.log("🟧 [AVA] Réponse Brute Adhésion:", raw); // Décommentez si besoin de debug

  try {
    const data = JSON.parse(raw);
    
    // Vérification d'erreur fonctionnelle renvoyée en JSON
    if (data.code && data.message && !data.id_adhesion) {
        console.error("❌ [AVA] Erreur API:", data.message);
        return { error: data.message, raw: data };
    }

    console.log("🟩 [AVA] Adhésion réussie ! ID:", data.id_adhesion || data.id_contrat);
    return data;
  } catch {
    console.error("❌ [AVA] Erreur parsing réponse:", raw);
    return { error: "Format de réponse AVA invalide", raw };
  }
}


//-------------------------------------------------------
//  3. VALIDATION D’ADHÉSION (WEBHOOK)
//-------------------------------------------------------
export async function validateAvaAdhesion(adhesionNumber: string) {
  console.log("🟦 [AVA] Validation contrat n°", adhesionNumber);

  const token = await getAvaToken();
  if (!token) throw new Error("Token manquant lors de la validation AVA");

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
    const data = JSON.parse(raw);
    
    console.log("🟩 [AVA] Contrat validé :", data);
    return data;

  } catch (e) {
    console.error("❌ [AVA] Erreur validation:", e);
    return { error: "Erreur technique validation" };
  }
}
