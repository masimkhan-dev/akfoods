import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { queryKeys } from '@/lib/query-keys';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { queueOrder, getQueuedOrders, removeQueuedOrder } from '@/lib/offline-queue';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { format } from 'date-fns';

/**
 * Hook to manage billing reference data and dashboard overview
 */
export const useBillingData = () => {
  const { data: menuItems = [] } = useCachedQuery(
    queryKeys.menu,
    () => db.getMenuItems(),
    { 
      persistKey: 'menu',
      select: (data: any[]) => data.filter(item => item.is_available),
      staleTime: Infinity,
    }
  );

  const { data: categories = [] } = useCachedQuery(
    queryKeys.categories,
    () => db.getCategories(),
    { persistKey: 'categories', staleTime: Infinity }
  );

  const { data: settings = [] } = useCachedQuery(
    queryKeys.settings,
    () => db.getSettings(),
    { persistKey: 'settings', staleTime: Infinity }
  );

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: overview = { revenue: 0, expenses: 0, totalKhata: 0 }, refetch: refetchOverview } = useQuery({
    queryKey: ['today_overview', today],
    queryFn: async () => {
      const [revRes, expRes, khataRes] = await Promise.all([
        supabase.from('bills').select('total').gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
        supabase.from('expenses').select('amount').eq('date', today),
        supabase.from('customers').select('current_balance'),
      ]);
      return {
        revenue: ((revRes.data || []) as { total: number }[]).reduce((s, b) => s + Number(b.total), 0),
        expenses: ((expRes.data || []) as { amount: number }[]).reduce((s, e) => s + Number(e.amount), 0),
        totalKhata: ((khataRes.data || []) as { current_balance: number }[]).reduce((s, c) => s + Number(c.current_balance), 0)
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  return { menuItems, categories, settings, overview, refetchOverview };
};

/**
 * Hook to handle offline order syncing
 */
export const useOfflineSync = (refetchOverview: () => void) => {
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const syncOfflineOrders = async () => {
      if (!navigator.onLine) return;
      const queued = await getQueuedOrders();
      if (queued.length === 0) return;
      
      setPendingSync(queued.length);
      for (const order of queued) {
        try {
          const { data, error } = await (supabase as any).rpc('create_order_atomic_v4', order.payload);
          if (!error && data?.success) {
            await removeQueuedOrder(order.id);
          }
        } catch (e) {
          console.error(`[Offline] Sync failed for ${order.id}:`, e);
        }
      }
      
      const remaining = await getQueuedOrders();
      setPendingSync(remaining.length);
      if (remaining.length === 0) refetchOverview();
    };

    window.addEventListener('online', syncOfflineOrders);
    syncOfflineOrders();
    return () => window.removeEventListener('online', syncOfflineOrders);
  }, [refetchOverview]);

  return { pendingSync, setPendingSync };
};

/**
 * Hook for order processing and printing orchestration
 */
export const useOrderProcessing = (onSuccess: (data: any) => void) => {
  const [saving, setSaving] = useState(false);

  const orderMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any).rpc('create_order_atomic_v4', payload);
      if (error) throw error;
      return data;
    },
    onSuccess,
    onError: async (error: any, payload: any) => {
      if (!navigator.onLine || error.message?.includes('fetch')) {
        await queueOrder(payload);
        toast.warning("Network issue. Order queued locally.");
      } else {
        toast.error(error.message || 'Order failed');
      }
    },
    onSettled: () => setSaving(false)
  });

  return { orderMutation, saving, setSaving };
};
