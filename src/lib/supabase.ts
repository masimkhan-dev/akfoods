import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { trackEgress, estimateSize } from './egress-monitor';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Centralized Supabase client instance with optimized configuration.
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: { 'x-application-name': 'akf-pos-system' },
    // Request timeout (10s)
    fetch: (url, options) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000);
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(id));
    },
  },
});

/**
 * Retry logic with exponential backoff and egress tracking.
 */
export const safeRequest = async <T>(
  requestFn: () => Promise<{ data: T | null; error: any; count?: number | null }>,
  options: { maxRetries?: number; endpoint: string }
): Promise<T> => {
  const { maxRetries = 2, endpoint } = options;
  let lastError: any;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const { data, error } = await requestFn();
      
      if (error) throw error;
      
      if (data) {
        const size = estimateSize(data);
        trackEgress(endpoint, size);
      }
      
      return data as T;
    } catch (e: any) {
      lastError = e;
      
      // Don't retry if it was aborted or if it's the last retry
      if (e.name === 'AbortError' || i === maxRetries) {
        break;
      }
      
      // Exponential backoff
      const delay = 1000 * Math.pow(2, i);
      console.warn(`[Supabase] 🔄 Retrying ${endpoint} (${i + 1}/${maxRetries}) after ${delay}ms...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  console.error(`[Supabase] ❌ Request failed after ${maxRetries} retries:`, lastError);
  throw lastError;
};
