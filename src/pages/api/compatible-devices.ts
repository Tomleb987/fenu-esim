import type { NextApiRequest, NextApiResponse } from "next";

const AIRALO_API_URL = process.env.AIRALO_API_URL;
const AIRALO_CLIENT_ID = process.env.AIRALO_CLIENT_ID;
const AIRALO_CLIENT_SECRET = process.env.AIRALO_CLIENT_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!AIRALO_API_URL || !AIRALO_CLIENT_ID || !AIRALO_CLIENT_SECRET) {
    return res.status(500).json({
      error: "Airalo API credentials missing",
    });
  }

  try {
    const response = await fetch(`${AIRALO_API_URL}/v2/devices/compatible`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-client-id": AIRALO_CLIENT_ID,
        "x-client-secret": AIRALO_CLIENT_SECRET,
      },
    });

    if (!response.ok) {
      return res.status(500).json({
        error: "Airalo API error",
        status: response.status,
        details: await response.text(),
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err: any) {
    return res.status(500).json({
      error: "Airalo API unreachable",
      details: err.message,
    });
  }
}
