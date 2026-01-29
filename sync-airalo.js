const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const AIRALO_API_URL = process.env.AIRALO_API_URL;
const AIRALO_CLIENT_ID = process.env.AIRALO_CLIENT_ID;
const AIRALO_CLIENT_SECRET = process.env.AIRALO_CLIENT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Taux de change par défaut (modifiable)
const USD_TO_EUR = 0.84;
const USD_TO_XPF = 100;
const MARGE = 1.30; // 30%

if (!AIRALO_CLIENT_ID || !AIRALO_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getAiraloToken() {
  const url = `${AIRALO_API_URL}/token`;
  const formData = new URLSearchParams();
  formData.append('client_id', AIRALO_CLIENT_ID);
  formData.append('client_secret', AIRALO_CLIENT_SECRET);
  formData.append('grant_type', 'client_credentials');

  const response = await axios.post(url, formData, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return response.data.data.access_token;
}

async function getAiraloPackages(token) {
  const url = `${AIRALO_API_URL}/packages`;
  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data.data;
}

function extractDataAmountAndUnit(dataStr, amount) {
  // dataStr ex: "1 GB", "10 MB", etc.
  if (typeof dataStr === 'string') {
    const match = dataStr.match(/([\d.]+)\s*(GB|MB|TB)/i);
    if (match) {
      return { data_amount: parseFloat(match[1]), data_unit: match[2].toUpperCase() };
    }
  }
  // fallback: use amount in MB
  return { data_amount: amount, data_unit: 'MB' };
}

function slugify(str) {
  return str
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function syncPackages() {
  try {
    console.log('Début de la synchronisation Airalo → Supabase');
    const token = await getAiraloToken();
    const countries = await getAiraloPackages(token);
    let allPackages = [];

    for (const country of countries) {
      const countryCode = country.country_code || country.slug;
      const region = country.title || country.region || countryCode;
      if (!country.operators) continue;
      for (const operator of country.operators) {
        if (!operator.packages) continue;
        for (const pkg of operator.packages) {
          const { data_amount, data_unit } = extractDataAmountAndUnit(pkg.data, pkg.amount);
          const price_usd = Math.round(pkg.price);
          const price_eur = Math.round(pkg.price * USD_TO_EUR);
          const price_xpf = Math.round(pkg.price * USD_TO_XPF);
          const final_price_usd = Math.round(price_usd * MARGE);
          const final_price_eur = Math.round(price_eur * MARGE);
          const final_price_xpf = Math.round(price_xpf * MARGE);
          allPackages.push({
            airalo_id: pkg.id,
            name: pkg.title,
            slug: slugify(pkg.title),
            description: pkg.short_info || (operator.info ? operator.info.join(' ') : null),
            country: countryCode,
            region: region,
            type: operator.type || null,
            data_amount,
            validity: pkg.day,
            includes_voice: pkg.voice !== null,
            includes_sms: pkg.text !== null,
            available_topup: operator.rechargeability || false,
            price_usd,
            price_eur,
            price_xpf,
            final_price_usd,
            final_price_eur,
            final_price_xpf,
            recommended_retail_price: pkg.prices ? pkg.prices.recommended_retail_price : null,
            operator_name: operator.title || null,
            operator_logo_url: operator.image ? operator.image.url : null,
            last_synced_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    if (allPackages.length > 0) {
      console.log('Exemple de package à insérer:', allPackages[0]);
    }

    const { error } = await supabase
      .from('airalo_packages')
      .upsert(allPackages, { onConflict: 'airalo_id' });

    if (error) {
      throw error;
    }

    console.log('Synchronisation terminée avec succès');
  } catch (err) {
    console.error('Erreur lors de la synchronisation:', err);
  }
}

syncPackages(); 
