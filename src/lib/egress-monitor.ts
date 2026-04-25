/**
 * Lightweight egress monitoring for Supabase requests.
 */

const LARGE_PAYLOAD_THRESHOLD = 100 * 1024; // 100KB

export const trackEgress = (endpoint: string, size: number) => {
  const isDev = import.meta.env.DEV;
  const sizeKB = (size / 1024).toFixed(2);

  if (isDev) {
    console.log(`[Egress Monitor] 📡 ${endpoint}: ${sizeKB}KB`);
  }

  // Production: Only log if it exceeds the threshold
  if (!isDev && size > LARGE_PAYLOAD_THRESHOLD) {
    console.warn(`[Egress Alert] ⚠️ Large payload detected on ${endpoint}: ${sizeKB}KB`);
    // Optional: Send to logging service (e.g., Sentry, PostHog)
    // captureMessage('High Egress Detected', { extra: { endpoint, sizeKB } });
  }
};

/**
 * Utility to estimate size of JSON object
 */
export const estimateSize = (data: any): number => {
  try {
    return new TextEncoder().encode(JSON.stringify(data)).length;
  } catch (e) {
    return 0;
  }
};
