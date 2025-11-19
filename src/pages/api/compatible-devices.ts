import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Endpoint qui interroge Airalo pour obtenir la liste Lite des appareils compatibles eSIM
 *
 * Paramètres possibles :
 *   /api/compatible-devices
 *   /api/compatible-devices?search=iphone
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const search = (req.query.search as string)?.toLowerCase() || null;

    // Vérification API KEY
    const apiKey = process.env.AIRALO_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Missing AIRALO_API_KEY env variable",
      });
    }

    // 🔥 Appel Airalo → Devices Lite
    const response = await fetch("https://partners-api.airalo.com/v2/devices-lite", {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      method: "GET",
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({
        error: "Airalo API error",
        details: err,
      });
    }

    const json = await response.json();
    const devices = json?.data || [];

    // Si utilisateur cherche un modèle précis → filtrage
    let filtered = devices;
    if (search) {
      filtered = devices.filter((d: any) =>
        d.device_name.toLowerCase().includes(search)
      );
    }

    return res.status(200).json({
      count: filtered.length,
      devices: filtered,
    });

  } catch (error: any) {
    console.error("API compatible-devices error:", error);

    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}
