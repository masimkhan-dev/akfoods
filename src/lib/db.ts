import { supabase, safeRequest } from './supabase';
import type { Database } from '@/integrations/supabase/types';

// Extract types from Database
type Tables = Database['public']['Tables'];
export type MenuItem = Tables['menu_items']['Row'];
export type Category = Tables['categories']['Row'];
export type Setting = Tables['settings']['Row'];
export type Order = Tables['bills']['Row'];
export type OrderInput = Tables['bills']['Insert'];

/**
 * Vendor-agnostic Database Adapter interface.
 */
export interface DBAdapter {
  // Static Reference Data
  getMenuItems(): Promise<MenuItem[]>;
  getCategories(): Promise<Category[]>;
  getSettings(): Promise<Setting[]>;
  
  // Orders
  getOrders(options?: { limit?: number; offset?: number; status?: string }): Promise<Order[]>;
  createOrder(order: OrderInput): Promise<Order>;
  
  // Customers & Khata
  getCustomers(): Promise<any[]>;
  getCustomerLedger(customerId: string): Promise<any[]>;
  recordManualEntry(customerId: string, amount: number, transactionType: 'credit' | 'payment', description: string): Promise<any>;
  
  // Helper for field selection
  select<T extends keyof Tables>(table: T, fields: string): any;
}

/**
 * Supabase implementation of DBAdapter with egress optimization.
 */
export const db: DBAdapter = {
  async getMenuItems() {
    return safeRequest(
      () => supabase
        .from('menu_items')
        .select('id,item_name,category,price,is_available,image_url,description')
        .order('category'),
      { endpoint: 'menu_items' }
    );
  },

  async getCategories() {
    return safeRequest(
      () => supabase
        .from('categories')
        .select('id,category_name,display_order')
        .order('display_order'),
      { endpoint: 'categories' }
    );
  },

  async getSettings() {
    return safeRequest(
      () => supabase
        .from('settings')
        .select('setting_key,setting_value'),
      { endpoint: 'settings' }
    );
  },

  async getOrders({ limit = 50, offset = 0, status }: { limit?: number; offset?: number; status?: string } = {}) {
    let query = supabase
      .from('bills')
      .select('id,created_at,total,customer_name,status,payment_method,order_type')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    return safeRequest(() => query, { endpoint: 'orders' });
  },

  async createOrder(order: OrderInput) {
    return safeRequest(
      () => supabase
        .from('bills')
        .insert(order)
        .select()
        .single(),
      { endpoint: 'create_order' }
    );
  },

  async getCustomers() {
    return safeRequest(
      () => supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name'),
      { endpoint: 'customers' }
    );
  },

  async getCustomerLedger(customerId: string) {
    return safeRequest(
      () => supabase
        .from('customer_ledger')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50),
      { endpoint: 'customer_ledger' }
    );
  },

  async recordManualEntry(customerId: string, amount: number, transactionType: 'credit' | 'payment', description: string) {
    return safeRequest(
      () => (supabase as any).rpc('record_customer_manual_entry', {
        p_customer_id: customerId,
        p_amount: amount,
        p_transaction_type: transactionType,
        p_description: description
      }),
      { endpoint: 'manual_entry' }
    );
  },

  select(table: string, fields: string) {
    return supabase.from(table).select(fields);
  }
};
