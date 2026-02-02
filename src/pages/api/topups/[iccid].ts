import type { NextApiRequest, NextApiResponse } from "next";
import { getAiraloToken } from "@/lib/airalo";
import { resilientFetch } from "@/lib/apiResilience";

const AIRALO_API_URL = process.env.AIRALO_API_URL;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { iccid } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!iccid || typeof iccid !== "string") {
    return res.status(400).json({ message: "Invalid ICCID" });
  }

  try {
    const token = await getAiraloToken();

    const result = await resilientFetch<{ data: any[] }>(
      `${AIRALO_API_URL}/sims/${iccid}/topups`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
      {
        maxRetries: 2,
        initialDelayMs: 1000,
        retryOn5xx: true,
        retryOnNetworkError: true,
        onRetry: (attempt, error) => {
          console.warn(`[Topups API Retry ${attempt}] ${error}`);
        },
      }
    );

    if (!result.success || !result.data) {
      console.error("Topup fetch error:", result.error);
      if (result.rawText) {
        console.error("Raw response:", result.rawText);
      }
      return res.status(500).json({ message: `Failed to fetch top-up data: ${result.error}` });
    }

    res.status(200).json(result.data);
  } catch (error: any) {
    console.error("Server error:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}
