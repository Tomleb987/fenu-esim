// src/lib/ava.ts

// 1. Authentification
export async function getAvaToken() {
  const endpoint = `${process.env.AVA_API_URL}/authentification/connexion.php`;
  const formData = new URLSearchParams();
  formData.append('partnerId', process.env.AVA_PARTNER_ID || '');
  formData.append('password', process.env.AVA_PASSWORD || '');

  try {
    const res = await fetch(endpoint, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
        body: formData.toString() 
    });
    const data = await res.json();
    return data.token;
  } catch (e) { 
    console.error("Erreur Auth AVA:", e); 
    return null; 
  }
}

// 2. Création de l'adhésion
export async function createAvaAdhesion(data: any) {
  const token = await getAvaToken();
  if (!token) throw new Error("Token manquant");

  // On détecte si c'est un produit "Incoming" (URL différente)
  const isIncoming = data.productType.includes('incoming');
  const url = `${process.env.AVA_API_URL}/assurance/${isIncoming ? 'tarification' : 'adhesion'}/creationAdhesion.php`;

  const formData = new URLSearchParams();
  // On remplit les champs obligatoires pour AVA
  formData.append('productType', data.productType);
  formData.append('journeyStartDate', data.startDate); // Format JJ/MM/AAAA attendu
  formData.append('journeyEndDate', data.endDate);
  formData.append('journeyRegion', "102"); // Monde par défaut
  formData.append('journeyAmount', "2000");
  formData.append('numberAdultCompanions', "0");
  formData.append('numberChildrenCompanions', "0");
  formData.append('numberCompanions', "0");
  formData.append('internalReference', data.internalRef);
  
  // Infos client JSON
  formData.append('subscriberInfos', JSON.stringify({
    firstName: data.firstName,
    lastName: data.lastName,
    birthdate: data.birthDate,
    subscriberEmail: data.email,
    subscriberCountry: data.countryCode || 'PF',
    address: data.address // { street, zip, city }
  }));
  
  formData.append('companionsInfos', "[]");
  formData.append('option', JSON.stringify(data.options || {}));
  formData.append('prod', 'false'); // Mode test

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Bearer ${token}` },
    body: formData.toString()
  });

  const text = await res.text();
  try { return JSON.parse(text); } catch { return { error: "Erreur API", raw: text }; }
}

// 3. Validation après paiement
export async function validateAvaAdhesion(adhesionNumber: string) {
  const token = await getAvaToken();
  const res = await fetch(`${process.env.AVA_API_URL}/assurance/adhesion/validationAdhesion.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Bearer ${token}` },
    body: new URLSearchParams({ numeroAdhesion: adhesionNumber }).toString()
  });
  return res.json();
}
