import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const deviceName = req.query.device as string;

    if (!deviceName) {
      return res.status(400).json({ error: "Missing device parameter ?device=iPhone 14" });
    }

    const url = `https://partners.airalo.com/api/v2/compatible-devices-lite?device_name=${encodeURIComponent(
      deviceName
    )}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "x-client-id": process.env.AIRALO_CLIENT_ID ?? "",
        "x-api-token": process.env.AIRALO_API_TOKEN ?? "",
      },
    });

    const raw = await response.text();

    if (!response.ok) {
      return res.status(400).json({
        error: "Airalo API error",
        details: raw,
      });
    }

    const data = JSON.parse(raw);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");

    return res.status(200).json({
      status: "ok",
      device: deviceName,
      result: data,
    });

  } catch (error: any) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
