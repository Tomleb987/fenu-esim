// src/lib/ava.ts — Version complète, stable et loguée
//-------------------------------------------------------
//    MODULE AVA POUR FENUASIM
//-------------------------------------------------------

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
  const endpoint = `${process.env.AVA_URL}/authentification/connexion.php`;

  const formData = new URLSearchParams();
  formData.append("identifiant", process.env.AVA_USERNAME || "");
  formData.append("motdepasse", process.env.AVA_PASSWORD || "");

  console.log("🔵 [AVA] Auth → URL:", endpoint);
  console.log("🔵 [AVA] Auth → Identifiant:", process.env.AVA_USERNAME);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const raw = await res.text();
    console.log("🟧 [AVA] Auth → RAW:", raw);

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("❌ [AVA] Auth → Réponse invalide:", raw);
      return null;
    }

    console.log("🟩 [AVA] Auth → PARSED:", data);

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
  console.log("🟦 [AVA] Création adhésion → Démarrage", quoteData);

  const token = await getAvaToken();
  if (!token) throw new Error("Token manquant (auth AVA impossible)");

  const endpoint = `${process.env.AVA_URL}/assurance/adhesion/creationAdhesion.php`;

  const formData = new URLSearchParams();

  //---------------------------------------------------
  // Champs obligatoires AVA
  //---------------------------------------------------
  formData.append("produit", quoteData.productType);
  formData.append("dateDebut", formatDateFR(quoteData.startDate));
  formData.append("dateFin", formatDateFR(quoteData.endDate));
  formData.append("zone", "102"); // Monde entier
  formData.append("prime", quoteData.tripCost || "2000");
  formData.append("nombreAssures", `${1 + (quoteData.companions?.length || 0)}`);
  formData.append("referenceInterne", quoteData.internalReference);

  //---------------------------------------------------
  // Souscripteur
  //---------------------------------------------------
  formData.append(
    "infosSouscripteur",
    JSON.stringify({
      nom: quoteData.subscriber.lastName,
      prenom: quoteData.subscriber.firstName,
      datenaissance: formatDateFR(quoteData.subscriber.birthDate),
      email: quoteData.subscriber.email,
      nationalite: quoteData.subscriber.countryCode || "FR",
      adresse: {
        rue: quoteData.subscriber.address.street,
        codepostal: quoteData.subscriber.address.zip,
        ville: quoteData.subscriber.address.city,
      },
    })
  );

  //---------------------------------------------------
  // Voyageurs supplémentaires
  //---------------------------------------------------
  formData.append(
    "infosAssures",
    JSON.stringify(
      quoteData.companions?.map((c: any) => ({
        nom: c.lastName,
        prenom: c.firstName,
        datenaissance: formatDateFR(c.birthDate),
      })) || []
    )
  );

  //---------------------------------------------------
  // Options AVA
  //---------------------------------------------------
  formData.append("options", JSON.stringify(quoteData.options || {}));

  console.log("🟦 [AVA] Création adhésion → FormData :", Object.fromEntries(formData.entries()));

  //---------------------------------------------------
  // Requête AVA
  //---------------------------------------------------
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

  const endpoint = `${process.env.AVA_URL}/assurance/adhesion/validationAdhesion.php`;

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
