import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { resilientFetch } from "@/lib/apiResilience";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { packageId, customerEmail, airalo_id, customerName, customerFirstname, quantity, description } = req.body;

    const AIRALO_API_URL = process.env.AIRALO_API_URL;
    
    // Step 1: Get Airalo access token with resilience
    const tokenResult = await resilientFetch<{ data: { access_token: string } }>(
      `${AIRALO_API_URL}/token`,
      {
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
      },
      {
        maxRetries: 2,
        initialDelayMs: 1000,
        retryOn5xx: true,
        retryOnNetworkError: true,
        onRetry: (attempt, error) => {
          console.warn(`[Airalo Token Retry ${attempt}] ${error}`);
        },
      }
    );

    if (!tokenResult.success || !tokenResult.data) {
      console.error("Failed to get Airalo token:", tokenResult.error);
      throw new Error(`Failed to get Airalo access token: ${tokenResult.error}`);
    }

    const accessToken = tokenResult.data.data.access_token;

    // Step 2: Create Airalo order with resilience
    const orderBody = {
      package_id: airalo_id,
      quantity: quantity || 1,
      type: 'sim',
      brand_settings_name: '',
      description: description
    };

    const orderResult = await resilientFetch<{
      data: {
        id: number;
        sims?: Array<{
          iccid: string;
          qrcode_url: string;
          direct_apple_installation_url: string;
        }>;
        data?: string;
      };
      meta?: { message: string };
    }>(
      `${AIRALO_API_URL}/orders`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(orderBody)
      },
      {
        maxRetries: 3,
        initialDelayMs: 1500,
        maxDelayMs: 10000,
        retryOn5xx: true,
        retryOnNetworkError: true,
        onRetry: (attempt, error, delayMs) => {
          console.warn(`[Airalo Order Retry ${attempt}] ${error}. Waiting ${Math.round(delayMs)}ms...`);
        },
      }
    );

    console.log("Airalo order result:", orderResult.success ? "success" : orderResult.error);

    if (!orderResult.success || !orderResult.data) {
      console.error(`Airalo order failed after ${orderResult.attempts} attempts:`, orderResult.error);
      if (orderResult.rawText) {
        console.error("Raw response (truncated):", orderResult.rawText);
      }
      throw new Error(`Airalo API error after ${orderResult.attempts} attempts: ${orderResult.error}`);
    }

    const orderData = orderResult.data;

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