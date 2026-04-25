import { QueryClient } from '@tanstack/react-query';

/**
 * Global cache invalidation utility.
 * Clears both React Query state and localStorage persistence.
 */
export const invalidateCache = async (queryClient: QueryClient, keys: string[]) => {
  // 1. Invalidate React Query caches
  await queryClient.invalidateQueries({
    queryKey: keys,
  });

  // 2. Clear localStorage caches (if any manual ones exist)
  keys.forEach((key) => {
    // We'll use a standard prefix for pos-cache
    const storageKey = `pos-cache:${key}`;
    localStorage.removeItem(storageKey);
  });

  console.log(`[Cache] 🗑️ Invalidated keys: ${keys.join(', ')}`);
};
