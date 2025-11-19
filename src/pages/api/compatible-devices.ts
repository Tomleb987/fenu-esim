import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const AIRALO_API_URL = process.env.AIRALO_API_URL;

    // 1️⃣ Récupération du token Airalo (même méthode que tes autres API)
    const tokenResponse = await fetch(`${AIRALO_API_URL}/token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.AIRALO_CLIENT_ID ?? "",
        client_secret: process.env.AIRALO_CLIENT_SECRET ?? "",
        grant_type: "client_credentials",
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error("❌ Token error:", tokenError);
      return res.status(400).json({ error: "Airalo token error", details: tokenError });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.data.access_token;

    // 2️⃣ Appel API Airalo → Devices (Lite)
    const deviceResponse = await fetch(
      `${AIRALO_API_URL}/devices/compatibility-lite`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const raw = await deviceResponse.text();
    if (!deviceResponse.ok) {
      console.error("❌ Airalo devices error:", raw);
      return res.status(400).json({ error: "Airalo API error", details: raw });
    }

    const data = JSON.parse(raw);

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({ devices: data });
  } catch (error: any) {
    console.error("❌ API ERROR:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
