import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const AIRALO_API_URL = process.env.AIRALO_API_URL;

    // 1️⃣ Token Airalo
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
      console.error("Token error:", tokenText);
      return res.status(400).json({ error: "Airalo token error", details: tokenText });
    }

    const tokenData = JSON.parse(tokenText);
    const accessToken = tokenData.data.access_token;

    // 2️⃣ Appel correct : /utilities/devices/compatibility-lite
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
