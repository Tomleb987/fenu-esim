import type { NextApiRequest, NextApiResponse } from "next";
import { getAiraloToken } from "@/lib/airalo";
import { resilientFetch, generateIdempotencyKey } from "@/lib/apiResilience";

interface AiraloAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface AiraloTopUpPayload {
  iccid: string;
  package_id: string; // This is the Airalo package ID for the top-up
  description?: string;
}

// Updated to reflect the user-provided Airalo API response structure
interface AiraloApiActualResponseData {
  package_id: string;
  quantity: string;
  type: string;
  description: string;
  esim_type: string;
  validity: number;
  package: string;
  data: string;
  price: number;
  created_at: string;
  id: number; // This seems to be the Airalo TopUp ID
  code: string; // This could also be a reference ID
  currency: string;
  manual_installation: string;
  qrcode_installation: string;
  installation_guides: { [key: string]: string };
}

interface AiraloApiActualResponse {
  data: AiraloApiActualResponseData;
  meta: {
    message: string;
  };
}

interface ProcessedAiraloTopUpResponse {
  success: boolean;
  message?: string;
  airalo_topup_id?: string; // Changed from reference_id to be more specific
  airalo_response_data?: AiraloApiActualResponseData;
}

async function callAiraloTopUpAPI(
  payload: AiraloTopUpPayload,
  token: string
): Promise<ProcessedAiraloTopUpResponse> {
  console.log(`Payload:`, JSON.stringify(payload));
  console.log(
    `Attempting Airalo top-up for ICCID: ${payload.iccid} with package: ${payload.package_id}`
  );
  
  const AIRALO_API_URL = process.env.AIRALO_API_URL;
  const AIRALO_TOPUP_API_ENDPOINT = `${AIRALO_API_URL}/orders/topups`;

  // Use resilient fetch with automatic retry on 5xx errors
  const result = await resilientFetch<AiraloApiActualResponse>(
    AIRALO_TOPUP_API_ENDPOINT,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    },
    {
      maxRetries: 3,
      initialDelayMs: 1500,
      maxDelayMs: 10000,
      retryOn5xx: true,
      retryOnNetworkError: true,
      onRetry: (attempt, error, delayMs) => {
        console.warn(`[Airalo Top-Up Retry ${attempt}] ${error}. Waiting ${Math.round(delayMs)}ms...`);
      },
    }
  );

  if (!result.success || !result.data) {
    console.error(`Airalo Top-Up API Error after ${result.attempts} attempts:`, result.error);
    if (result.rawText) {
      console.error("Raw response (truncated):", result.rawText);
    }
    throw new Error(
      `Airalo Top-Up API request failed after ${result.attempts} attempts: ${result.error}`
    );
  }

  const data = result.data;
  console.log("Airalo Top-Up API Response:", data);

  const success = data.meta?.message === "success" || (result.lastStatus !== undefined && result.lastStatus >= 200 && result.lastStatus < 300);
  // Prefer data.id as the primary top-up ID, fallback to data.code
  const airaloTopupId = data.data?.id?.toString() || data.data?.code;

  return {
    success: success,
    airalo_topup_id: airaloTopupId,
    message: data.meta?.message || (success ? "Top-up successful" : "Top-up failed"),
    airalo_response_data: data.data,
  };
}

interface TopUpRequestBody {
  sim_iccid: string;
  airalo_package_id: string; // Airalo's own ID for the package
  stripe_session_id: string;
  customer_email: string;
  package_db_id: string; // Your internal database ID for the package
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const {
    sim_iccid,
    airalo_package_id,
    // stripe_session_id, // Not directly used for Airalo call, but good to have for context if needed later
    // customer_email, // Not directly used for Airalo call
    // package_db_id, // Not directly used for Airalo call
  } = req.body as TopUpRequestBody;

  if (!sim_iccid || !airalo_package_id) {
    return res
      .status(400)
      .json({ message: "Missing sim_iccid or airalo_package_id for top-up." });
  }

  let airaloApiToken = "";
  try {
    /* @ts-ignore */
    airaloApiToken = await getAiraloToken();
    console.log("🔑 Airalo Token: ", airaloApiToken);
  } catch (error) {
    console.error("Failed to get Airalo API token:", error);
    // No logging to DB here, just return error
    return res
      .status(500)
      .json({ success: false, message: "Failed to authenticate with Airalo service." });
  }

  try {
    const airaloPayload: AiraloTopUpPayload = {
      iccid: sim_iccid,
      package_id: airalo_package_id,
    };

    const topUpResult = await callAiraloTopUpAPI(airaloPayload, airaloApiToken);

    if (topUpResult.success && topUpResult.airalo_topup_id) {
      // Return success and the necessary data for webhook to log
      return res.status(200).json({
        success: true,
        message: topUpResult.message || "Top-up processed successfully by Airalo.",
        airalo_topup_id: topUpResult.airalo_topup_id,
        airalo_response_data: topUpResult.airalo_response_data, // Pass full response data
      });
    } else {
      throw new Error(
        topUpResult.message || "Airalo top-up was not successful or top-up ID missing."
      );
    }
  } catch (error) {
    console.error("Error processing Airalo top-up in handler:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process top-up with Airalo.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Removed logTopUpActivity function entirely
