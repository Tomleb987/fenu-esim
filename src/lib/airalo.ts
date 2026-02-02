import { resilientFetch } from "@/lib/apiResilience";

const AIRALO_API_URL = process.env.AIRALO_API_URL;

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

interface AiraloTokenResponse {
  data: {
    access_token: string;
    expires_in: number;
  };
}

export async function getAiraloToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // Fetch new token with resilience
  const result = await resilientFetch<AiraloTokenResponse>(
    `${AIRALO_API_URL}/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.AIRALO_CLIENT_ID,
        client_secret: process.env.AIRALO_CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    },
    {
      maxRetries: 2,
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      retryOn5xx: true,
      retryOnNetworkError: true,
      onRetry: (attempt, error) => {
        console.warn(`[Airalo Token Retry ${attempt}] ${error}`);
      },
    }
  );

  if (!result.success || !result.data) {
    console.error("Failed to get Airalo token:", result.error);
    if (result.rawText) {
      console.error("Raw response:", result.rawText);
    }
    throw new Error(`Failed to get Airalo token: ${result.error}`);
  }

  console.log("Airalo token fetched successfully");
  cachedToken = result.data.data.access_token;
  tokenExpiry = Date.now() + (result.data.data.expires_in - 60) * 1000; // 1 min margin
  return cachedToken;
}

interface AiraloPackagesResponse {
  data: Array<{
    id: string;
    [key: string]: any;
  }>;
}

export async function getAiraloPackages(countryCode: string) {
  const token = await getAiraloToken();
  
  const result = await resilientFetch<AiraloPackagesResponse>(
    `${AIRALO_API_URL}/packages?country_code=${countryCode}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
    {
      maxRetries: 2,
      initialDelayMs: 1000,
      retryOn5xx: true,
      retryOnNetworkError: true,
      onRetry: (attempt, error) => {
        console.warn(`[Airalo Packages Retry ${attempt}] ${error}`);
      },
    }
  );

  if (!result.success || !result.data) {
    console.error("Failed to get Airalo packages:", result.error);
    throw new Error(`Failed to get Airalo packages: ${result.error}`);
  }

  return result.data;
}

interface AiraloOrderResponse {
  data: {
    id: string;
    [key: string]: any;
  };
  meta?: {
    message: string;
  };
}

export async function createAiraloOrder({ packageId, email }: { packageId: string, email: string }) {
  const token = await getAiraloToken();
  
  const result = await resilientFetch<AiraloOrderResponse>(
    `${AIRALO_API_URL}/orders`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        package_id: packageId,
        email,
      }),
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

  if (!result.success || !result.data) {
    console.error("Failed to create Airalo order:", result.error);
    if (result.rawText) {
      console.error("Raw response:", result.rawText);
    }
    throw new Error(`Erreur Airalo: ${result.error}`);
  }

  return result.data;
}

export async function getAiraloOrder(orderId: string) {
  const token = await getAiraloToken();
  
  const result = await resilientFetch<AiraloOrderResponse>(
    `${AIRALO_API_URL}/orders/${orderId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
    {
      maxRetries: 2,
      initialDelayMs: 1000,
      retryOn5xx: true,
      retryOnNetworkError: true,
      onRetry: (attempt, error) => {
        console.warn(`[Airalo Get Order Retry ${attempt}] ${error}`);
      },
    }
  );

  if (!result.success || !result.data) {
    console.error("Failed to get Airalo order:", result.error);
    throw new Error(`Failed to get Airalo order: ${result.error}`);
  }

  return result.data;
}
