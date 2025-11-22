// src/lib/ava.ts

// --- 1. AUTHENTIFICATION ---
export async function getAvaToken() {
  const endpoint = `${process.env.AVA_URL}/authentification/connexion.php`;

  const formData = new URLSearchParams();
  formData.append("identifiant", process.env.AVA_USERNAME || "");
  formData.append("motdepasse", process.env.AVA_PASSWORD || "");

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await res.json();

    if (!data?.token) {
      console.error("Erreur AVA : pas de token", data);
      return null;
    }

    return data.token;
  } catch (e) {
    console.error("Erreur Auth AVA:", e);
    return null;
  }
}

// --- 2. CRÉATION D'ADHÉSION ---
export async function createAvaAdhesion(quoteData: any) {
  const token = await getAvaToken();
  if (!token) throw new Error("Token manquant");

  const endpoint = `${process.env.AVA_URL}/assurance/adhesion/creationAdhesion.php`;

  // Formatage conforme AVA
  const formData = new URLSearchParams();

  formData.append("produit", quoteData.productType);
  formData.append("dateDebut", formatDateFR(quoteData.startDate)); // JJ/MM/AAAA
  formData.append("dateFin", formatDateFR(quoteData.endDate));
  formData.append("zone", "102");
  formData.append("prime", quoteData.tripCost || "2000");
  formData.append("nombreAssures", `${1 + (quoteData.companions?.length || 0)}`);
  formData.append("referenceInterne", quoteData.internalReference);

  // Souscripteur
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

  // Assurés supplémentaires
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

  // Options
  formData.append("options", JSON.stringify(quoteData.options || {}));

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${token}`,
    },
    body: formData.toString(),
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return { error: "Réponse AVA invalide", raw: text };
  }
}

// --- 3. VALIDATION AVANT ENVOI DU CONTRAT ---
export async function validateAvaAdhesion(adhesionNumber: string) {
  const token = await getAvaToken();
  if (!token) throw new Error("Token manquant");

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

  return res.json();
}

// --- UTILITAIRE : FORMAT DATE ---
function formatDateFR(input: string) {
  if (!input) return "";
  const d = new Date(input);
  return d.toLocaleDateString("fr-FR");
}
