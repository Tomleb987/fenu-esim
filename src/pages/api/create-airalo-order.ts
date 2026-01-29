import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { packageId, customerEmail, airalo_id, customerName, customerFirstname, quantity, description } = req.body;


    const AIRALO_API_URL = process.env.AIRALO_API_URL;
    const tokenResponse = await fetch(`${AIRALO_API_URL}/token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.AIRALO_CLIENT_ID ?? '',
        client_secret: process.env.AIRALO_CLIENT_SECRET ?? '',
        grant_type: 'client_credentials'
      })
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      throw new Error(`Failed to get Airalo access token: ${tokenError}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.data.access_token;

    const orderBody = {
      package_id: airalo_id,
      quantity: quantity || 1,
      type: 'sim',
      brand_settings_name: '',
      description: description
    };

    const orderResponse = await fetch(`${AIRALO_API_URL}/orders`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(orderBody)
    });
    console.log("Airalo order response here: ", orderResponse);

    const orderText = await orderResponse.clone().text();
    if (!orderResponse.ok) {
      throw new Error(`Airalo API error: ${orderText}`);
    }
    const orderData = JSON.parse(orderText);

    const sim = orderData.data.sims?.[0];
    const { data: order, error } = await supabase.from('airalo_orders').insert({
      order_id: orderData.data.id.toString(),
      email: customerEmail,
      package_id: packageId,
      sim_iccid: sim?.iccid || null,
      qr_code_url: sim?.qrcode_url || null,
      apple_installation_url: sim?.direct_apple_installation_url || null,
      status: orderData.meta?.message || "success",
      data_balance: orderData.data.data || null,
      created_at: new Date().toISOString(),
      nom: customerName,
      prenom: customerFirstname
    }).select().single();

    if (error) throw error;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ order });
  } catch (error: any) {
    console.error('Erreur API:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
}