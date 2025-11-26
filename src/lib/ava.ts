// src/lib/ava.ts

function formatDateFR(date: string) {
  if (!date) return "";
  if (date.includes('/')) return date;
  const parts = date.split('-');
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
    return data.Token || data.token;
  } catch (err) {
    console.error("💥 Auth AVA Error:", err);
    return null;
  }
}

// 2. SIMULATION DE PRIX (NOUVEAU : Le Vrai Devis)
export async function getAvaPrice(quoteData: any) {
  const token = await getAvaToken();
  if (!token) throw new Error("Auth AVA échouée");

  const isIncoming = quoteData.productType.includes('incoming');
  // On utilise demandeTarif.php qui ne crée PAS de contrat
  const endpoint = `${process.env.AVA_API_URL}/assurance/tarification/${isIncoming ? 'demandeTarif' : 'demandeTarif'}.php`;

  const formData = new URLSearchParams();
  formData.append("productType", quoteData.productType);
  formData.append("journeyStartDate", formatDateFR(quoteData.startDate));
  formData.append("journeyEndDate", formatDateFR(quoteData.endDate));
  formData.append("journeyRegion", "102"); // Monde
  
  // Pour le devis, on envoie le montant estimé
  const travelers = 1 + (quoteData.companions?.length || 0);
  const price = quoteData.tripCost || (quoteData.tripCostPerPerson ? quoteData.tripCostPerPerson * travelers : 2000);
  formData.append("journeyAmount", price.toString());

  formData.append("numberAdultCompanions", (quoteData.companions?.length || 0).toString());
  formData.append("numberChildrenCompanions", "0");
  formData.append("numberCompanions", (quoteData.companions?.length || 0).toString());

  // Info minimale pour le tarif
  formData.append("subscriberInfos", JSON.stringify({
    birthdate: formatDateFR(quoteData.subscriber.birthDate),
    subscriberCountry: quoteData.subscriber.countryCode || "PF"
  }));

  // Accompagnateurs (juste les dates de naissance pour le tarif)
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

// 3. CRÉATION ADHÉSION (Au moment de payer)
export async function createAvaAdhesion(quoteData: any) {
  const token = await getAvaToken();
  const isIncoming = quoteData.productType.includes('incoming');
  const endpoint = `${process.env.AVA_API_URL}/assurance/${isIncoming ? 'tarification' : 'adhesion'}/creationAdhesion.php`;

  const formData = new URLSearchParams();
  // ... (Mêmes champs que le devis + Identité complète)
  formData.append("productType", quoteData.productType);
  formData.append("journeyStartDate", formatDateFR(quoteData.startDate));
  formData.append("journeyEndDate", formatDateFR(quoteData.endDate));
  formData.append("journeyRegion", "102");
  formData.append("journeyAmount", quoteData.tripCost.toString());
  formData.append("numberAdultCompanions", (quoteData.companions?.length || 0).toString());
  formData.append("numberChildrenCompanions", "0");
  formData.append("numberCompanions", (quoteData.companions?.length || 0).toString());
  formData.append("internalReference", quoteData.internalReference || "");

  formData.append("subscriberInfos", JSON.stringify({
    firstName: quoteData.subscriber.firstName,
    lastName: quoteData.subscriber.lastName,
    birthdate: formatDateFR(quoteData.subscriber.birthDate),
    subscriberEmail: quoteData.subscriber.email,
    subscriberCountry: quoteData.subscriber.countryCode || "PF",
    address: quoteData.subscriber.address
  }));

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
  try { return JSON.parse(raw); } catch { return { error: "Erreur format adhésion", raw }; }
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
