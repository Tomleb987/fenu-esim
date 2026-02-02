/**
 * API Resilience Utilities
 * 
 * Provides safe JSON parsing, retry logic with exponential backoff,
 * and resilient fetch wrappers for external API calls (especially Airalo).
 */

export interface SafeJsonResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  rawText?: string;
}

/**
 * Safely parse JSON from a fetch Response.
 * Checks content-type and handles non-JSON responses gracefully.
 */
export async function safeJsonParse<T>(response: Response): Promise<SafeJsonResult<T>> {
  const rawText = await response.text();
  
  // Check content-type header
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  
  // If response is not OK, return error with raw text for debugging
  if (!response.ok) {
    return {
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
      rawText: rawText.substring(0, 500), // Truncate for logging
    };
  }
  
  // If content-type is not JSON, check if it looks like HTML (common for 502/503 errors)
  if (!isJson) {
    const looksLikeHtml = rawText.trim().startsWith("<") || rawText.includes("<!DOCTYPE");
    if (looksLikeHtml) {
      return {
        success: false,
        error: `Received HTML instead of JSON (possible gateway error)`,
        rawText: rawText.substring(0, 500),
      };
    }
  }
  
  // Try to parse JSON
  try {
    const data = JSON.parse(rawText) as T;
    return { success: true, data };
  } catch (parseError) {
    return {
      success: false,
      error: `JSON parse error: ${parseError instanceof Error ? parseError.message : "Unknown"}`,
      rawText: rawText.substring(0, 500),
    };
  }
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  retryOn5xx?: boolean;
  retryOnNetworkError?: boolean;
  onRetry?: (attempt: number, error: string, delayMs: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, "onRetry">> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  retryOn5xx: true,
  retryOnNetworkError: true,
};

/**
 * Check if an error/status should be retried
 */
function shouldRetry(status: number | null, isNetworkError: boolean, options: Required<Omit<RetryOptions, "onRetry">>): boolean {
  if (isNetworkError && options.retryOnNetworkError) {
    return true;
  }
  if (status !== null && status >= 500 && status < 600 && options.retryOn5xx) {
    return true;
  }
  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, initialDelayMs: number, maxDelayMs: number): number {
  const exponentialDelay = initialDelayMs * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ResilientFetchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  lastStatus?: number;
  rawText?: string;
}

/**
 * Perform a fetch with automatic retry on transient failures.
 * Includes safe JSON parsing.
 */
export async function resilientFetch<T>(
  url: string,
  options: RequestInit,
  retryOptions?: RetryOptions
): Promise<ResilientFetchResult<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastError = "";
  let lastStatus: number | undefined;
  let lastRawText: string | undefined;
  
  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      const response = await fetch(url, options);
      lastStatus = response.status;
      
      const parseResult = await safeJsonParse<T>(response);
      
      if (parseResult.success) {
        return {
          success: true,
          data: parseResult.data,
          attempts: attempt,
          lastStatus: response.status,
        };
      }
      
      // Parse failed - check if we should retry
      lastError = parseResult.error || "Unknown parse error";
      lastRawText = parseResult.rawText;
      
      if (shouldRetry(response.status, false, opts) && attempt <= opts.maxRetries) {
        const delayMs = calculateDelay(attempt, opts.initialDelayMs, opts.maxDelayMs);
        console.warn(`[Retry ${attempt}/${opts.maxRetries}] ${lastError}. Retrying in ${Math.round(delayMs)}ms...`);
        retryOptions?.onRetry?.(attempt, lastError, delayMs);
        await sleep(delayMs);
        continue;
      }
      
      // Not retryable or out of retries
      return {
        success: false,
        error: lastError,
        attempts: attempt,
        lastStatus: response.status,
        rawText: lastRawText,
      };
      
    } catch (networkError) {
      // Network-level error (DNS, connection refused, timeout, etc.)
      lastError = networkError instanceof Error ? networkError.message : "Network error";
      lastStatus = undefined;
      
      if (opts.retryOnNetworkError && attempt <= opts.maxRetries) {
        const delayMs = calculateDelay(attempt, opts.initialDelayMs, opts.maxDelayMs);
        console.warn(`[Retry ${attempt}/${opts.maxRetries}] Network error: ${lastError}. Retrying in ${Math.round(delayMs)}ms...`);
        retryOptions?.onRetry?.(attempt, lastError, delayMs);
        await sleep(delayMs);
        continue;
      }
      
      return {
        success: false,
        error: `Network error: ${lastError}`,
        attempts: attempt,
      };
    }
  }
  
  // Should not reach here, but just in case
  return {
    success: false,
    error: lastError || "Max retries exceeded",
    attempts: opts.maxRetries + 1,
    lastStatus,
    rawText: lastRawText,
  };
}

/**
 * Generate a unique idempotency key for an operation.
 * Can be used to safely retry operations without duplicating them.
 */
export function generateIdempotencyKey(prefix: string, ...parts: (string | number)[]): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const partsStr = parts.join("-");
  return `${prefix}-${partsStr}-${timestamp}-${random}`;
}

/**
 * Wrapper for Airalo API calls with built-in resilience
 */
export async function resilientAiraloCall<T>(
  endpoint: string,
  token: string,
  method: "GET" | "POST" = "GET",
  body?: object
): Promise<ResilientFetchResult<T>> {
  const AIRALO_API_URL = process.env.AIRALO_API_URL;
  const url = `${AIRALO_API_URL}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  };
  
  if (body && method === "POST") {
    options.body = JSON.stringify(body);
  }
  
  return resilientFetch<T>(url, options, {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 8000,
    retryOn5xx: true,
    retryOnNetworkError: true,
    onRetry: (attempt, error, delayMs) => {
      console.log(`[Airalo API Retry] Attempt ${attempt}, error: ${error}, waiting ${delayMs}ms`);
    },
  });
}
