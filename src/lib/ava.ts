// src/lib/ava.ts
import axios from 'axios';
import { format, isValid } from 'date-fns';
import { AVA_TOURIST_OPTIONS, getOptionsForProduct } from './ava_options';

const AVA_API_URL = process.env.AVA_API_URL || "https://api-ava.fr/api";
const PARTNER_ID = process.env.AVA_PARTNER_ID;
const PASSWORD = process.env.AVA_PASSWORD;
const IS_PROD = process.env.AVA_ENV === 'prod' ? 'true' : 'false';
const CODE_PRODUIT = "ava_tourist_card";

// Token cache — valide 15 minutes selon doc AVA
let _cachedToken: string | null = null;
let _tokenExpiry: number = 0;

console.log(`🔧 Mode AVA: IS_PROD=${IS_PROD} (AVA_ENV=${process.env.AVA_ENV})`);

function assertEnvVar(name: string, value: string | undefined) {
  if (!value) throw new Error(`Variable ${name} manquante`);
}

/* --- 1. AUTHENTIFICATION --- */
export async function getAvaToken(): Promise<string> {
  // Retourner le token caché s'il est encore valide (marge de 60s)
  if (_cachedToken && Date.now() < _tokenExpiry - 60_000) {
    console.log("🔑 Token AVA depuis cache");
    return _cachedToken;
  }

  assertEnvVar('AVA_PARTNER_ID', PARTNER_ID);
  assertEnvVar('AVA_PASSWORD', PASSWORD);

  const params = new URLSearchParams();
  params.append('partnerId', PARTNER_ID!);
  params.append('password', PASSWORD!);

  try {
    const response = await axios.post(`${AVA_API_URL}/authentification/connexion.php`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const d = response.data;
    console.log("🔑 Nouveau token AVA obtenu");

    let token: string | null = null;
    if (d && d.Token) token = d.Token;
    else if (d && d.token) token = d.token;
    else if (typeof d === 'string' && d.length > 20) token = d;

    if (!token) throw new Error("Token non reçu");

    // Mise en cache — token valide 15 minutes
    _cachedToken = token;
    _tokenExpiry = Date.now() + 15 * 60 * 1000;

    return _cachedToken;
  } catch (error: any) {
    console.error("❌ Erreur Auth AVA:", error.message);
    throw error;
  }
}

/* --- HELPERS --- */
const toFrDate = (d: string | undefined | null) => {
    if (!d) return undefined;
    try {
        const dateStr = d.split("T")[0];
        const [year, month, day] = dateStr.split("-").map(Number);
        if (!year || !month || !day) return undefined;
        const date = new Date(year, month - 1, day);
        return isValid(date) ? format(date, 'dd/MM/yyyy') : undefined;
    } catch {
        return undefined;
    }
};

function buildTarificationPayload(data: any): URLSearchParams {
  const companions = data.companions || data.additionalTravelers || [];
  const totalTravelers = 1 + companions.length;
  
  const totalTripCost = Number(data.tripCost) || 0;
  const costPerPerson = totalTravelers > 0 ? Math.ceil(totalTripCost / totalTravelers) : 0;

  const journeyStartDate = toFrDate(data.startDate);
  const journeyEndDate = toFrDate(data.endDate);
  
  const subscriberBirth = toFrDate(data.subscriber?.birthDate) || "01/01/1990";

  if (!journeyStartDate || !journeyEndDate) throw new Error("Dates invalides");

  const params = new URLSearchParams();

  const productType = data.productType || CODE_PRODUIT;
  // TODO: confirmer le code produit AVA exact pour avantages_pom (en attente retour AVA/ANSET)
  params.append('productType', productType);
  params.append('journeyStartDate', journeyStartDate);
  params.append('journeyEndDate', journeyEndDate);
  const isPOM = productType === 'avantages_pom';
  if (!isPOM) {
    params.append('journeyAmount', String(costPerPerson));
  }
  // journeyRegion : requis pour ava_pass et avantages_360, optionnel pour les autres
  if (productType === 'ava_pass' || isPOM) {
    params.append('journeyRegion', String(data.destinationRegion || "102"));
  } else {
    // Pour tourist_card et carte_sante : envoi de la région si fournie
    if (data.destinationRegion) {
      params.append('journeyRegion', String(data.destinationRegion));
    }
  }

  if (!isPOM) {
    params.append('numberAdultCompanions', String(companions.length));
  }

  if (productType === 'ava_carte_sante') {
    const childCount = companions.filter((c: any) => {
      const birth = new Date(c.birthDate);
      const age = (new Date().getFullYear() - birth.getFullYear());
      return age < 20;
    }).length;
    params.append('numberChildrenCompanions', String(childCount));
  } else if (!isPOM) {
    params.append('numberChildrenCompanions', "0");
  }

  // numberCompanions : requis pour ava_pass et avantages_360 uniquement
  if (productType === 'ava_pass' || isPOM) {
    params.append('numberCompanions', String(companions.length));
  }

  const sub = data.subscriber || {};
  const subscriberInfos: Record<string, any> = {
      subscriberCountry: data.subscriberCountry || "PF",
      birthdate: subscriberBirth,
      firstName: sub.firstName || "",
      lastName: sub.lastName || "",
      subscriberEmail: sub.email || "",
  };

  // Adresse : n'inclure que si les champs sont remplis
  if (sub.address || sub.postalCode || sub.city) {
      subscriberInfos.address = {
          street: sub.address || "",
          zip: sub.postalCode || "",
          city: sub.city || "",
      };
  }

  console.log("👤 subscriberInfos envoyé à AVA:", JSON.stringify(subscriberInfos));
  params.append('subscriberInfos', JSON.stringify(subscriberInfos));

  const companionsInfos = companions.map((c: any) => ({
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      birthdate: toFrDate(c.birthDate) || "",
      parental_link: c.parental_link || "13"
  }));
  params.append('companionsInfos', JSON.stringify(companionsInfos));

  const optionsJson: any = {};
  
  if (data.options && Array.isArray(data.options)) {
      data.options.forEach((selectedId: string) => {
          const allOptions = getOptionsForProduct(data.productType || CODE_PRODUIT);
          const parentOption = allOptions.find((opt: any) => 
              opt.id === selectedId || 
              opt.defaultSubOptionId === selectedId || 
              opt.subOptions?.some((sub: any) => sub.id === selectedId)
          );

          if (parentOption) {
              const parentId = parentOption.id;
              if (!optionsJson[parentId]) optionsJson[parentId] = {};

              if (parentOption.type === 'date-range') {
                  // Utiliser les dates spécifiques saisies par le client, sinon fallback sur les dates du voyage
                  const dateRange = data.optionDateRanges?.[parentId];
                  const fromDate = dateRange?.from_date_option
                      ? toFrDate(dateRange.from_date_option) || journeyStartDate
                      : journeyStartDate;
                  const toDate = dateRange?.to_date_option
                      ? toFrDate(dateRange.to_date_option) || journeyEndDate
                      : journeyEndDate;

                  for (let i = 0; i < totalTravelers; i++) {
                      optionsJson[parentId][String(i)] = {
                          from_date_option: fromDate,
                          to_date_option: toDate,
                      };
                  }
              } else {
                  for (let i = 0; i < totalTravelers; i++) {
                      optionsJson[parentId][String(i)] = selectedId;
                  }
              }
          }
      });
  }
  
  params.append('option', JSON.stringify(optionsJson));
  params.append('prod', IS_PROD);

  console.log(`📦 Payload AVA — prod=${IS_PROD}, region=${data.destinationRegion}, montant=${costPerPerson}€/pax, options=${JSON.stringify(optionsJson)}`);

  return params;
}

/* --- 2. CALCUL DU PRIX --- */
export async function getAvaPrice(data: any) {
  try {
    const token = await getAvaToken();
    const params = buildTarificationPayload(data);

    console.log(`📤 Appel tarif AVA → demandeTarif.php`);

    const response = await axios.post(
      `${AVA_API_URL}/assurance/tarification/demandeTarif.php`,
      params, 
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const d = response.data;
    console.log("📥 Réponse Tarif AVA (brut):", JSON.stringify(d));

    let price = null;
    if (d) {
        price = d["Prix total avec options (en €)"] ?? d.montant_total ?? d.tarif_total ?? d.tarif;
    }

    if (price == null) {
        console.warn("⚠️ Prix non trouvé dans la réponse AVA. Clés disponibles:", Object.keys(d || {}));
        if (d.erreur || d.message) console.warn("⚠️ Message AVA:", d.erreur || d.message);
        return 0;
    }

    console.log("💰 Prix extrait:", price);
    return parseFloat(String(price));

  } catch (error: any) {
    console.error("❌ Erreur API AVA tarif:", error.response?.data || error.message);
    return 0;
  }
}

/* --- 3. CRÉATION ADHÉSION --- */
export async function createAvaAdhesion(data: any) {
    const token = await getAvaToken();
    const params = buildTarificationPayload(data); 

    console.log("📤 Appel création adhésion AVA → creationAdhesion.php");

    try {
        const response = await axios.post(
            `${AVA_API_URL}/assurance/adhesion/creationAdhesion.php`,
            params,
            { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const d = response.data;
        console.log("📥 Réponse Adhésion AVA (brut):", JSON.stringify(d));

        const adhesionNumber = d?.["Numéro AD"] || d?.numeroAD || d?.adhesion_number;
        const contractNumber = d?.["Numéro IN"] || d?.numeroIN || null;
        const price = d?.["Prix total avec options (en €)"] || d?.montant_total;
        const contractLink = d?.["Certificat de garantie"] || null;
        const cgLink = d?.["CG"] || null;
        const ipidLink = d?.["IPID"] || null;
        const ficpLink = d?.["FICP"] || null;

        console.log(`✅ Adhésion créée: ${adhesionNumber} | Contrat: ${contractNumber} | Prix: ${price} | Certificat: ${contractLink}`);

        if (!adhesionNumber) throw new Error("Pas de numéro d'adhésion reçu");

        return {
            adhesion_number: adhesionNumber,
            contract_number: contractNumber,
            contract_link: contractLink,
            cg_link: cgLink,
            ipid_link: ipidLink,
            ficp_link: ficpLink,
            montant_total: price ? parseFloat(String(price)) : 0,
            raw: d,
        };

    } catch (error: any) {
        console.error("❌ Erreur Adhésion AVA:", error.response?.data || error.message);
        throw new Error("Échec création contrat AVA");
    }
}

/* --- 4. VALIDATION --- */
export async function validateAvaAdhesion(adhesionNumber: string) {
    const token = await getAvaToken();

    const params = new URLSearchParams();
    params.append('numeroAdhesion', adhesionNumber);

    console.log(`📤 Appel validation adhésion AVA → validationAdhesion.php (${adhesionNumber})`);

    try {
        const response = await axios.post(
            `${AVA_API_URL}/assurance/adhesion/validationAdhesion.php`,
            params,
            { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const d = response.data;
        console.log("📥 Réponse Validation AVA (brut):", JSON.stringify(d));

        const certificatUrl = d?.["Certificat de garantie"] || d?.certificat || d?.certificate_url || null;
        const attestationUrlRaw = d?.["Attestation d'assurance"] || d?.attestation || null;
        const message = d?.["Succès"] || d?.message || d?.Message || null;

        console.log(`✅ Validation OK | Message: ${message} | Certificat: ${certificatUrl} | Attestation brute: ${attestationUrlRaw}`);

        // ℹ️ L'attestation AVA nécessite une session navigateur AVA pour être téléchargée.
        // Elle est transmise manuellement par l'équipe FENUASIM après validation.
        console.log(`📎 URL attestation AVA (envoi manuel) : ${attestationUrlRaw}`);

        return {
            success: true,
            certificat_url: certificatUrl,
            attestation_url: null, // envoi manuel — ne pas transmettre l'URL AVA directe
            attestation_url_ava: attestationUrlRaw, // conservé pour usage interne/admin
            message,
        };

    } catch (error: any) {
        console.error("❌ Erreur Validation AVA:", error.response?.data || error.message);
        throw new Error("Échec validation contrat AVA");
    }
}
