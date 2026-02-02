import { NextApiRequest, NextApiResponse } from 'next';
import { getAiraloToken } from "@/lib/airalo";
import { safeJsonParse } from "@/lib/apiResilience";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { endpoint, method = 'GET', body } = req.body;

    if (!endpoint) {
      return res.status(400).json({ 
        success: false, 
        error: 'Endpoint is required' 
      });
    }

    const AIRALO_API_URL = process.env.AIRALO_API_URL;
    if (!AIRALO_API_URL) {
      throw new Error('AIRALO_API_URL is not configured');
    }

    // Get Airalo token
    const airaloToken = await getAiraloToken();

    // Make request to Airalo API
    const fullUrl = `${AIRALO_API_URL}${endpoint}`;
    console.log('airalo API Making request to:', fullUrl);
    console.log('airalo API Method:', method);
    
    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${airaloToken}`,
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    console.log('airalo API Response status:', response.status);
    console.log('airalo API Response ok:', response.ok);

    // Use safe JSON parsing to handle non-JSON responses (e.g., 502 HTML pages)
    const parseResult = await safeJsonParse<any>(response);

    if (!parseResult.success) {
      console.error('airalo API Failed to parse response:', parseResult.error);
      if (parseResult.rawText) {
        console.error('Raw response:', parseResult.rawText);
      }
      return res.status(502).json({
        success: false,
        error: `Failed to parse Airalo API response: ${parseResult.error}`,
      });
    }

    const data = parseResult.data;
    console.log('airalo API Response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('airalo API Request failed:', {
        status: response.status,
        error: data?.message || 'Airalo API request failed',
        details: data
      });
      return res.status(response.status).json({
        success: false,
        error: data?.message || 'Airalo API request failed',
        details: data
      });
    }

    console.log('airalo API Request successful');
    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Airalo API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}