/**
 * Format une date ISO (2025-01-02) → 02/01/2025
 */
function formatDateFR(dateStr: string) {
  if (!dateStr) return "";
  if (dateStr.includes("/")) return dateStr;
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return "";
}

/* ---------------------------------------------------------
   1️⃣ AUTHENTIFICATION AVA
--------------------------------------------------------- */
export async function getAvaToken() {
  const apiUrl = process.env.AVA_API_URL;
  const partnerId = process.env.AVA_PARTNER_ID;
  const password = process.env.AVA_PASSWORD;

  if (!apiUrl || !partnerId || !password) {
    throw new Error("Configuration AVA manquante (.env)");
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

    if (!token) throw new Error("Pas de token reçu de AVA");
    return token;
  } catch (err) {
    console.error("💥 [AVA] Auth Error:", err);
    return null;
  }
}

/* ---------------------------------------------------------
   2️⃣ CALCUL DEVIS (getAvaPrice)
--------------------------------------------------------- */
export async function getAvaPrice(quoteData: any) {
  const token = await getAvaToken();
  if (!token) throw new Error("Auth AVA échouée");

  if (!quoteData?.startDate || !quoteData?.endDate || !quoteData?.subscriber?.birthDate) {
    return { error: "Champs manquants (startDate, endDate ou birthDate)" };
  }

  const travelers = 1 + (quoteData.companions?.length || 0);

  let pricePerPerson = 2000;
  if (quoteData.tripCost) {
    pricePerPerson = Math.round(quoteData.tripCost / travelers);
  }

  const formData = new URLSearchParams();
  formData.append("productType", quoteData.productType);
  formData.append("journeyStartDate", formatDateFR(quoteData.startDate));
  formData.append("journeyEndDate", formatDateFR(quoteData.endDate));
  formData.append("journeyAmount", pricePerPerson.toString());
  formData.append("journeyRegion", "102"); // Monde par défaut

  formData.append("numberAdultCompanions", (quoteData.companions?.filter((c: any) => c.type === 'adult')?.length || "0").toString());
  formData.append("numberChildrenCompanions", (quoteData.companions?.filter((c: any) => c.type === 'child')?.length || "0").toString());
  formData.append("numberCompanions", (quoteData.companions?.length || 0).toString());

  // ✅ Infos Assuré – requis même pour un devis
  formData.append("subscriberInfos", JSON.stringify({
    firstName: quoteData.subscriber.firstName || "John",
    lastName: quoteData.subscriber.lastName || "Doe",
    birthdate: formatDateFR(quoteData.subscriber.birthDate),
    subscriberEmail: quoteData.subscriber.email || "test@email.com",
    subscriberCountry: quoteData.subscriber.countryCode || "PF",
    address: {
      street: quoteData.subscriber.address?.street || "Rue de test",
      zip: quoteData.subscriber.address?.zip || "98700",
      city: quoteData.subscriber.address?.city || "Papeete"
    }
  }));

  // ✅ Accompagnateurs
  const companionsList = (quoteData.companions || []).map((c: any) => ({
    firstName: c.firstName || "Ami",
    lastName: c.lastName || "Test",
    birthdate: formatDateFR(c.birthDate),
    parental_link: c.parental_link || "13" // 13 = autre, 4 = conjoint, 6 = enfant
  }));
  formData.append("companionsInfos", JSON.stringify(companionsList));

  // ✅ Options (doit être un objet même vide)
  formData.append("option", JSON.stringify(quoteData.options || {}));

  // ✅ Mode test
  formData.append("prod", "false");

  console.log(`💰 [AVA] Demande Tarif (Prix/pers: ${pricePerPerson})...`);
  console.log("[DEBUG] Données envoyées à AVA:", Object.fromEntries(formData.entries()));

  const res = await fetch(`${process.env.AVA_API_URL}/assurance/tarification/demandeTarif.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${token}`,
    },
    body: formData.toString(),
  });

  const raw = await res.text();
  console.log("🧾 [AVA] Réponse brute :", raw);

  try {
    return JSON.parse(raw);
  } catch {
    return { error: "Format réponse invalide", raw };
  }
}

/* ---------------------------------------------------------
   3️⃣ CRÉATION D'ADHÉSION (Contrat AVA)
--------------------------------------------------------- */
export async function createAvaAdhesion(quoteData: any) {
  const token = await getAvaToken();
  if (!token) throw new Error("Token manquant");

  const endpoint = `${process.env.AVA_API_URL}/assurance/adhesion/creationAdhesion.php`;

  const travelers = 1 + (quoteData.companions?.length || 0);

  let pricePerPerson = 2000;
  if (quoteData.tripCost) {
    pricePerPerson = Math.round(quoteData.tripCost / travelers);
  }

  const formData = new URLSearchParams();
  formData.append("journeyAmount", pricePerPerson.toString());
  formData.append("productType", quoteData.productType);
  formData.append("journeyStartDate", formatDateFR(quoteData.startDate));
  formData.append("journeyEndDate", formatDateFR(quoteData.endDate));
  formData.append("journeyRegion", "102");
  formData.append("internalReference", quoteData.internalReference || "");

  formData.append("numberAdultCompanions", (quoteData.companions?.filter((c: any) => c.type === 'adult')?.length || "0").toString());
  formData.append("numberChildrenCompanions", (quoteData.companions?.filter((c: any) => c.type === 'child')?.length || "0").toString());
  formData.append("numberCompanions", (quoteData.companions?.length || 0).toString());

  formData.append("subscriberInfos", JSON.stringify({
    firstName: quoteData.subscriber.firstName,
    lastName: quoteData.subscriber.lastName,
    birthdate: formatDateFR(quoteData.subscriber.birthDate),
    subscriberEmail: quoteData.subscriber.email,
    subscriberCountry: quoteData.subscriber.countryCode || "PF",
    address: {
      street: quoteData.subscriber.address?.street,
      zip: quoteData.subscriber.address?.zip,
      city: quoteData.subscriber.address?.city
    }
  }));

  const companionsList = (quoteData.companions || []).map((c: any) => ({
    firstName: c.firstName,
    lastName: c.lastName,
    birthdate: formatDateFR(c.birthDate),
    parental_link: c.parental_link
  }));
  formData.append("companionsInfos", JSON.stringify(companionsList));

  formData.append("option", JSON.stringify(quoteData.options || {}));
  formData.append("prod", "false");

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

    if (data["200 OK"] && typeof data["200 OK"] === "string") {
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

/* ---------------------------------------------------------
   4️⃣ VALIDATION DE L’ADHÉSION
--------------------------------------------------------- */
export async function validateAvaAdhesion(adhesionNumber: string) {
  const token = await getAvaToken();
  const res = await fetch(
    `${process.env.AVA_API_URL}/assurance/adhesion/validationAdhesion.php`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      body: new URLSearchParams({ numeroAdhesion: adhesionNumber }).toString(),
    }
  );
  return res.json();
}
