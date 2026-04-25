import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Enhanced useQuery with localStorage persistence.
 * Useful for static data that should survive page reloads and reduce egress.
 */
export function useCachedQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error, T, QueryKey>, 'queryKey' | 'queryFn'> & {
    persistKey?: string;
  }
) {
  const { persistKey, ...queryOptions } = options || {};

  // 1. Initial Load from localStorage (if persistKey provided)
  const initialData = persistKey ? (() => {
    const cached = localStorage.getItem(`pos-cache:${persistKey}`);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        // If data is less than 24h old, use it as placeholder
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return data as T;
        }
      } catch (e) {
        console.error(`[Cache] ❌ Failed to parse ${persistKey}`, e);
      }
    }
    return undefined;
  })() : undefined;

  const query = useQuery({
    queryKey,
    queryFn,
    placeholderData: initialData,
    ...queryOptions,
  });

  // 2. Persist to localStorage on success
  useEffect(() => {
    if (persistKey && query.data && !query.isPlaceholderData) {
      localStorage.setItem(`pos-cache:${persistKey}`, JSON.stringify({
        data: query.data,
        timestamp: Date.now(),
      }));
    }
  }, [persistKey, query.data, query.isPlaceholderData]);

  return query;
}
