
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'cashier');

-- User roles table (secure role storage)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'cashier',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- User profiles table
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Menu items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_menu_items_category ON public.menu_items(category);
CREATE INDEX idx_menu_items_available ON public.menu_items(is_available);

-- Deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_name TEXT NOT NULL,
  deal_code TEXT NOT NULL UNIQUE,
  deal_items JSONB NOT NULL DEFAULT '[]',
  deal_price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Bills table
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_phone TEXT,
  order_type TEXT DEFAULT 'takeaway',
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  amount_paid DECIMAL(10,2),
  change_returned DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_bills_date ON public.bills(created_at);
CREATE INDEX idx_bills_number ON public.bills(bill_number);

-- Bill items table
CREATE TABLE public.bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_bill_items_bill_id ON public.bill_items(bill_id);

-- Settings table
CREATE TABLE public.settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- user_roles: only admins can view/manage, users can see own
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- user_profiles
CREATE POLICY "Users can view all profiles" ON public.user_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage profiles" ON public.user_profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- categories: anyone authenticated can read, admin can modify
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);
CREATE POLICY "Admin can manage categories" ON public.categories
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- menu_items: anyone can read, admin can modify
CREATE POLICY "Anyone can view menu items" ON public.menu_items
  FOR SELECT USING (true);
CREATE POLICY "Admin can manage menu items" ON public.menu_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- deals: anyone can read, admin can modify
CREATE POLICY "Anyone can view deals" ON public.deals
  FOR SELECT USING (true);
CREATE POLICY "Admin can manage deals" ON public.deals
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- bills: authenticated users can view and insert
CREATE POLICY "Users can view bills" ON public.bills
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert bills" ON public.bills
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- bill_items: authenticated users can view and insert
CREATE POLICY "Users can view bill items" ON public.bill_items
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert bill items" ON public.bill_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- settings: anyone authenticated can read, admin can modify
CREATE POLICY "Anyone can view settings" ON public.settings
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can manage settings" ON public.settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============ STORAGE ============
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true);

CREATE POLICY "Anyone can view menu images" ON storage.objects
  FOR SELECT USING (bucket_id = 'menu-images');
CREATE POLICY "Admin can upload menu images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'menu-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Admin can update menu images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'menu-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Admin can delete menu images" ON storage.objects
  FOR DELETE USING (bucket_id = 'menu-images' AND auth.uid() IS NOT NULL);

-- ============ SEED DATA ============

-- Categories
INSERT INTO public.categories (category_name, display_order) VALUES
('AKF Burgers', 1),
('Shawarma', 2),
('Fries & Nuggets', 3),
('Chow Mein & Sandwich', 4),
('Wings', 5),
('Pizza', 6),
('Combo Deals', 7);

-- Menu Items
INSERT INTO public.menu_items (item_name, category, price, description) VALUES
('Special Burger', 'AKF Burgers', 600, 'Our signature special burger'),
('Tower Burger', 'AKF Burgers', 500, 'Stacked high with flavor'),
('Zinger Burger', 'AKF Burgers', 350, 'Crispy and spicy'),
('Cheese Zinger Burger', 'AKF Burgers', 400, 'Zinger with extra cheese'),
('Classic Burger', 'AKF Burgers', 250, 'Traditional taste'),
('Chicken Mushroom Burger', 'AKF Burgers', 400, 'With mushroom sauce'),
('Beef Jalapeno Burger', 'AKF Burgers', 500, 'Spicy beef patty'),
('Sausage Burger', 'AKF Burgers', 250, 'With sausage'),
('Shami Burger', 'AKF Burgers', 130, 'Local favorite'),
('Egg Shami Burger', 'AKF Burgers', 150, 'Shami with egg'),
('Chicken Shawarma', 'Shawarma', 150, 'Classic chicken shawarma'),
('Beef Shawarma', 'Shawarma', 200, 'Premium beef shawarma'),
('Double Shawarma', 'Shawarma', 250, 'Extra loaded shawarma'),
('French Fries', 'Fries & Nuggets', 150, 'Crispy golden fries'),
('Pizza Fries', 'Fries & Nuggets', 400, 'Fries with pizza topping'),
('Loaded Fries', 'Fries & Nuggets', 350, 'Fully loaded fries'),
('Nuggets (6 pcs)', 'Fries & Nuggets', 250, 'Chicken nuggets'),
('Nuggets (12 pcs)', 'Fries & Nuggets', 450, 'Large chicken nuggets'),
('Chicken Chow Mein', 'Chow Mein & Sandwich', 300, 'Stir fried noodles'),
('Club Sandwich', 'Chow Mein & Sandwich', 350, 'Triple decker sandwich'),
('Hot Wings (6 pcs)', 'Wings', 300, 'Spicy hot wings'),
('Hot Wings (12 pcs)', 'Wings', 550, 'Large spicy hot wings'),
('BBQ Wings (6 pcs)', 'Wings', 350, 'BBQ glazed wings'),
('Small Pizza', 'Pizza', 500, '8 inch pizza'),
('Medium Pizza', 'Pizza', 800, '10 inch pizza'),
('Large Pizza', 'Pizza', 1200, '12 inch pizza');

-- Deals
INSERT INTO public.deals (deal_name, deal_code, deal_items, deal_price) VALUES
('Deal D-1', 'D-1', '{"items": ["1 Zinger Burger", "1 Fries", "1 Regular Drink"]}', 500),
('Deal D-2', 'D-2', '{"items": ["2 Zinger Burgers", "2 Fries", "2 Regular Drinks"]}', 1000),
('Deal D-3', 'D-3', '{"items": ["2 Medium Pizza", "1 Fries", "1 Liter Drink"]}', 2100),
('Deal D-4', 'D-4', '{"items": ["1 Special Burger", "1 Loaded Fries", "1 Regular Drink"]}', 800),
('Deal D-5', 'D-5', '{"items": ["4 Shawarma", "1 Fries", "1 Liter Drink"]}', 750);

-- Settings
INSERT INTO public.settings (setting_key, setting_value) VALUES
('restaurant_name', 'AKF BURGERS'),
('address', 'Inqilab Road Near Ittefaq Model School Chowk Surizai Bala, Peshawar'),
('phone1', '0339-8181882'),
('phone2', '03169752735'),
('tax_enabled', 'false'),
('tax_percentage', '0'),
('receipt_footer', 'Thank You! Visit Again\n\nPowered by AKF POS');

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username)
  VALUES (NEW.id, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
  paid_to VARCHAR(200),
  receipt_image TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_expenses_category ON public.expenses(category);

-- Create expense_categories table
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name VARCHAR(100) NOT NULL UNIQUE,
  category_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Expenses RLS policies
CREATE POLICY "Authenticated users can view expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can insert expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update expenses"
  ON public.expenses FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete expenses"
  ON public.expenses FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Expense categories RLS policies
CREATE POLICY "Anyone can view expense categories"
  ON public.expense_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage expense categories"
  ON public.expense_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger for expenses
CREATE OR REPLACE FUNCTION public.update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_expenses_updated_at();
-- Migration: Atomic Bill Number Generation Fix for UAT
-- Date: 2026-02-19

-- 1. Store daily counters for bills to handle concurrency
CREATE TABLE IF NOT EXISTS public.bill_counters (
  counter_date DATE PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0
);

-- 2. Enable RLS and provide basic access
ALTER TABLE public.bill_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Any authenticated user can manage counters" ON public.bill_counters;
CREATE POLICY "Any authenticated user can manage counters" ON public.bill_counters 
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 3. Atomic function to get next bill number (The key fix)
CREATE OR REPLACE FUNCTION public.generate_next_bill_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  today_str TEXT := to_char(CURRENT_DATE, 'YYYYMMDD');
  next_val INTEGER;
BEGIN
  -- Insert or increment the counter for today in a single atomic transaction
  INSERT INTO public.bill_counters (counter_date, last_value)
  VALUES (today_date, 1)
  ON CONFLICT (counter_date) DO UPDATE
  SET last_value = bill_counters.last_value + 1
  RETURNING last_value INTO next_val;
  
  -- Return formatted number: AKF-YYYYMMDD-001
  RETURN 'AKF-' || today_str || '-' || LPAD(next_val::text, 3, '0');
END;
$$;
-- Migration: Hardened Order Creation v3
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10,2) DEFAULT 0;

DROP INDEX IF EXISTS idx_bills_created_at_fixed;
CREATE INDEX idx_bills_created_at_fixed ON public.bills(created_at DESC);

CREATE OR REPLACE FUNCTION public.create_order_atomic_v3(
  p_idempotency_key UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_order_type TEXT,
  p_discount NUMERIC,
  p_tax_rate NUMERIC,
  p_payment_method TEXT,
  p_amount_paid NUMERIC,
  p_delivery_charge NUMERIC,
  p_created_by UUID,
  p_items JSONB
) RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_bill_number TEXT;
  v_bill_id UUID;
  v_subtotal NUMERIC := 0;
  v_tax NUMERIC := 0;
  v_total NUMERIC := 0;
  v_change NUMERIC := 0;
  v_bill_number TEXT;
BEGIN
  SELECT bill_number, id INTO v_existing_bill_number, v_bill_id 
  FROM public.bills 
  WHERE idempotency_key = p_idempotency_key
    AND created_at > NOW() - INTERVAL '30 days';

  IF v_existing_bill_number IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 
      'is_duplicate', true, 
      'bill_number', v_existing_bill_number, 
      'bill_id', v_bill_id,
      'total', (SELECT total FROM public.bills WHERE id = v_bill_id),
      'change_returned', (SELECT change_returned FROM public.bills WHERE id = v_bill_id)
    );
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Order must contain items'; END IF;

  SELECT SUM((item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC)
  INTO v_subtotal FROM jsonb_array_elements(p_items) AS item;

  IF v_subtotal IS NULL OR v_subtotal <= 0 THEN RAISE EXCEPTION 'Financial Error: Invalid subtotal'; END IF;

  v_tax := ROUND((v_subtotal - COALESCE(p_discount, 0)) * COALESCE(p_tax_rate, 0), 2);
  v_total := (v_subtotal - COALESCE(p_discount, 0)) + v_tax + COALESCE(p_delivery_charge, 0);
  v_change := GREATEST(0, p_amount_paid - v_total);

  v_bill_number := public.generate_next_bill_number();

  INSERT INTO public.bills (
    idempotency_key, bill_number, customer_name, customer_phone, order_type,
    subtotal, discount, tax, total, delivery_charge, payment_method, 
    amount_paid, change_returned, created_by, created_at
  ) VALUES (
    p_idempotency_key, v_bill_number, p_customer_name, p_customer_phone, p_order_type,
    v_subtotal, p_discount, v_tax, v_total, p_delivery_charge, p_payment_method, 
    p_amount_paid, v_change, p_created_by, now()
  ) RETURNING id INTO v_bill_id;

  INSERT INTO public.bill_items (bill_id, item_name, quantity, unit_price, total_price)
  SELECT v_bill_id, (item->>'item_name'), (item->>'quantity')::INTEGER, (item->>'unit_price')::NUMERIC,
         ROUND((item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC, 2)
  FROM jsonb_array_elements(p_items) AS item;

  RETURN jsonb_build_object(
    'success', true, 
    'bill_id', v_bill_id, 
    'bill_number', v_bill_number,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'total', v_total, 
    'change_returned', v_change,
    'created_at', now()
  );
END;
$$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bills_backup_2026') THEN
        CREATE TABLE public.bills_backup_2026 AS SELECT * FROM public.bills;
    END IF;
END $$;

UPDATE public.bills b
SET total = sub.items_sum + b.tax - b.discount + COALESCE(b.delivery_charge, 0),
    subtotal = sub.items_sum
FROM (
  SELECT bill_id, SUM(total_price) AS items_sum
  FROM public.bill_items GROUP BY bill_id
) sub
WHERE b.id = sub.bill_id 
AND ABS(b.total - (sub.items_sum + b.tax - b.discount + COALESCE(b.delivery_charge, 0))) > 0.01;
-- =============================================================
-- AKF POS SYSTEM â€” Dummy Data Cleanup Script
-- Purpose : Delete all test/dummy transactional data
-- Safe    : Does NOT touch users, menu, categories, or settings
-- Run in  : Supabase Dashboard â†’ SQL Editor
-- Date    : 2026-02-20
-- =============================================================

BEGIN;

-- Step 1: Delete bill line items FIRST (foreign key child of bills)
DELETE FROM public.bill_items;

-- Step 2: Delete all bills
DELETE FROM public.bills;

-- Step 3: Reset the daily bill counter (so next bill starts at AKF-YYYYMMDD-001)
DELETE FROM public.bill_counters;

-- Step 4: Delete all test expenses
DELETE FROM public.expenses;

-- =============================================================
-- The following tables are INTENTIONALLY NOT TOUCHED:
--   âœ… auth.users          â†’ real user accounts preserved
--   âœ… public.user_profiles â†’ preserved
--   âœ… public.user_roles    â†’ preserved
--   âœ… public.menu_items    â†’ your menu setup preserved
--   âœ… public.categories    â†’ preserved
--   âœ… public.deals         â†’ preserved
--   âœ… public.settings      â†’ restaurant config preserved
-- =============================================================

COMMIT;

-- Verify everything is clean
SELECT 'bills'       AS table_name, COUNT(*) AS remaining_rows FROM public.bills
UNION ALL
SELECT 'bill_items'  AS table_name, COUNT(*) AS remaining_rows FROM public.bill_items
UNION ALL
SELECT 'bill_counters' AS table_name, COUNT(*) AS remaining_rows FROM public.bill_counters
UNION ALL
SELECT 'expenses'    AS table_name, COUNT(*) AS remaining_rows FROM public.expenses;
