/**
 * Centralized query keys for React Query.
 * Includes a version suffix for global cache busting.
 */

const CACHE_VERSION = import.meta.env.VITE_CACHE_VERSION || '1';

export const queryKeys = {
  // Static Reference Data
  menu: ['menu', { version: CACHE_VERSION }],
  categories: ['categories', { version: CACHE_VERSION }],
  settings: ['settings', { version: CACHE_VERSION }],
  tables: ['tables', { version: CACHE_VERSION }],
  taxes: ['taxes', { version: CACHE_VERSION }],

  // Dynamic Data
  orders: (filters?: Record<string, any>) => ['orders', filters].filter(Boolean),
  billItems: (billId: string) => ['bill_items', billId],
  expenses: (filters?: Record<string, any>) => ['expenses', filters].filter(Boolean),
  userProfiles: ['user_profiles'],
  userRoles: (userIds?: string[]) => ['user_roles', userIds].filter(Boolean),
};
