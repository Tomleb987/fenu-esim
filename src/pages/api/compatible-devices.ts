import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const AIRALO_API_URL = process.env.AIRALO_API_URL;

    // --------------------------
    // 1️⃣ Récupération du token
    // --------------------------
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

    const tokenText = await tokenResponse.text();

    if (!tokenResponse.ok) {
      return res.status(400).json({
        error: "Airalo token error",
        details: tokenText,
      });
    }

    const tokenData = JSON.parse(tokenText);
    const accessToken = tokenData.data.access_token;

    // --------------------------
    // 2️⃣ Appel compatibilité
    // --------------------------
    const deviceResponse = await fetch(
      `${AIRALO_API_URL}/utilities/devices/compatibility-lite`,
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
      return res.status(400).json({
        error: "Airalo API error",
        details: raw,
      });
    }

    const parsed = JSON.parse(raw);

    // --------------------------
    // 3️⃣ Réponse OK
    // --------------------------
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");

    return res.status(200).json(parsed);

  } catch (error: any) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
